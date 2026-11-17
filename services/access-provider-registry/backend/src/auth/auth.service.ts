import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import argon2 from "argon2";
import { EVENT_TYPES, EventBus, signTokens, verifyToken, type AuthUser, type StaffRole } from "@wahter/shared";
import {
  ACCESS_KEY_MAX_ATTEMPTS,
  ACCESS_KEY_TTL_MS,
  MAX_FAILED_ATTEMPTS,
  maskEmail,
  shouldLock,
} from "../accounts/access-rules";
import { AccountsRepository, type AccountRow } from "../accounts/accounts.repository";
import type { DemoLoginDto, LoginDto, VerifyAccessKeyDto } from "./auth.dto";
import { Mailer } from "./mailer";

// The paper's authentication flow (Section IV.C.2a): System Access (pick a
// portal) → Staff Login (username and password) → Access Key Verification (a
// six-digit key sent to the account's email). Only the last step issues a token.

// The same answer for "no such user" and "wrong password", so the login form
// can't be used to find out which usernames exist
const BAD_CREDENTIALS = "Incorrect username or password.";

// argon2id of a random string nobody knows; only used to even out timing
const TIMING_DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$lrTdOybi0jrqX0ank2nDMw$bEJBwF1R2vUSSAYCsnaqiLZvQQKgsScZseZvfF9MV/M";

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function sameHash(a: string, b: string) {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

const DEMO_USERNAME: Partial<Record<StaffRole, string>> = {
  Physician: "demo.physician",
  Nurse: "demo.nurse",
  Pharmacist: "demo.pharmacist",
  BillingStaff: "demo.billing",
  SystemAdministrator: "demo.admin",
};

@Injectable()
export class AuthService {
  constructor(
    private readonly accounts: AccountsRepository,
    private readonly mailer: Mailer,
    private readonly bus: EventBus,
  ) {}

  // Step 2: check the password, then email the access key (or, with the key
  // turned off, return the session straight away)
  async login({ role, username, password }: LoginDto) {
    const account = await this.accounts.findByUsername(username);
    if (!account || account.is_demo) {
      // still pay for one hash check, so a missing username doesn't answer faster
      await argon2.verify(TIMING_DUMMY_HASH, password).catch(() => false);
      this.publishFailure(username, null, "Unknown username");
      throw new UnauthorizedException(BAD_CREDENTIALS);
    }
    this.refuseIfBlocked(account);

    if (!(await argon2.verify(account.password_hash, password))) {
      await this.countFailure(account, "Wrong password");
      throw new UnauthorizedException(BAD_CREDENTIALS);
    }
    // checked after the password, so a wrong portal doesn't confirm the username exists
    if (account.role !== role) {
      this.publishFailure(username, account.id, `Tried the ${role} portal`);
      throw new ForbiddenException("This account doesn't belong to that portal. Go back and pick yours.");
    }

    // ACCESS_KEY_REQUIRED=false skips step 3 and signs in on the password
    // alone. Only for showing the prototype to people who can't reach the
    // laptop's inbox; the paper's flow needs the key, so it's on by default.
    if (process.env.ACCESS_KEY_REQUIRED === "false") return this.startSession(account);

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const challengeId = randomUUID();
    await this.accounts.createChallenge({
      id: challengeId,
      accountId: account.id,
      role: account.role,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + ACCESS_KEY_TTL_MS),
    });
    try {
      await this.mailer.sendAccessKey(account.email, account.name, code, ACCESS_KEY_TTL_MS / 60_000);
    } catch {
      throw new ServiceUnavailableException("Couldn't send your access key. Try again in a moment.");
    }
    return { challengeId, sentTo: maskEmail(account.email), expiresInSeconds: ACCESS_KEY_TTL_MS / 1000 };
  }

  // Step 3: the access key. A wrong key counts toward the same lockout as a
  // wrong password.
  async verify({ challengeId, code }: VerifyAccessKeyDto) {
    const challenge = await this.accounts.findChallenge(challengeId);
    if (!challenge || challenge.consumed_at) throw new NotFoundException("That sign-in has expired. Start again.");
    const account = await this.accounts.findById(challenge.account_id);
    if (!account) throw new NotFoundException("That sign-in has expired. Start again.");
    this.refuseIfBlocked(account);

    if (challenge.expires_at.getTime() < Date.now() || challenge.attempts >= ACCESS_KEY_MAX_ATTEMPTS) {
      throw new UnauthorizedException("That access key has expired. Go back and sign in again for a new one.");
    }
    if (!sameHash(hashCode(code), challenge.code_hash)) {
      await this.accounts.countChallengeAttempt(challenge.id);
      await this.countFailure(account, "Wrong access key");
      throw new UnauthorizedException("That access key doesn't match. Check the latest email and try again.");
    }
    if (!(await this.accounts.consumeChallenge(challenge.id))) {
      throw new UnauthorizedException("That access key was already used. Sign in again.");
    }
    return this.startSession(account);
  }

  // Try Demo: a fixed demo account per portal, no password or access key.
  // Off unless the server is started with DEMO_ACCOUNTS_ENABLED=true.
  async demoLogin({ role }: DemoLoginDto) {
    if (process.env.DEMO_ACCOUNTS_ENABLED !== "true") throw new ForbiddenException("Demo mode is turned off.");
    const username = DEMO_USERNAME[role];
    const account = username ? await this.accounts.findByUsername(username) : null;
    if (!account || !account.is_demo) throw new NotFoundException(`No demo account for ${role}.`);
    return this.startSession(account);
  }

  async refresh(refreshToken: string) {
    let user: AuthUser;
    try {
      user = verifyToken(refreshToken, "refresh");
    } catch {
      throw new UnauthorizedException("Session expired. Please sign in again.");
    }
    // a disabled, locked, or re-roled account doesn't keep a week-long session
    const account = await this.accounts.findByStaffId(user.id);
    if (!account || account.status !== "Active" || account.locked_at || account.role !== user.role) {
      throw new UnauthorizedException("Your access has changed. Please sign in again.");
    }
    const session = { id: account.staff_id, name: account.name, role: account.role };
    return { user: session, ...signTokens(session) };
  }

  async logout(user: AuthUser) {
    const account = await this.accounts.findByStaffId(user.id);
    if (account) this.bus.publish(EVENT_TYPES.loggedOut, { accountId: account.id }, user);
  }

  private refuseIfBlocked(account: AccountRow) {
    if (account.status !== "Active") throw new ForbiddenException("This account is disabled.");
    if (account.locked_at) {
      throw new ForbiddenException(
        `This account is locked after ${MAX_FAILED_ATTEMPTS} failed sign-ins. Ask a System Administrator to unlock it.`,
      );
    }
  }

  private async countFailure(account: AccountRow, reason: string) {
    const { failed_attempts: failedAttempts } = await this.accounts.recordFailure(account.id, MAX_FAILED_ATTEMPTS);
    this.publishFailure(account.username, account.id, reason);
    // exactly at the limit: the attempt that locked it, announced once
    if (shouldLock(failedAttempts) && failedAttempts === MAX_FAILED_ATTEMPTS) {
      this.bus.publish(EVENT_TYPES.accountLocked, { accountId: account.id, failedAttempts });
    }
  }

  private publishFailure(username: string, accountId: string | null, reason: string) {
    this.bus.publish(EVENT_TYPES.loginFailed, { username: username.trim().slice(0, 64), reason, accountId });
  }

  private async startSession(account: AccountRow) {
    await this.accounts.recordSuccess(account.id);
    // the provider ID is the user ID everywhere else (orders, charts, audit)
    const user = { id: account.staff_id, name: account.name, role: account.role };
    this.bus.publish(EVENT_TYPES.loginSucceeded, { accountId: account.id, role: account.role }, user);
    return { user, ...signTokens(user) };
  }
}
