import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import argon2 from "argon2";
import { EVENT_TYPES, EventBus, signTokens, verifyToken, type AuthUser, type PortalRole } from "@wahter/shared";
import { StaffRepository, type StaffRow } from "../staff/staff.repository";
import type { LoginDto, SignupDto } from "./auth.dto";

const HOSPITAL_ROLE_FOR_PORTAL: Record<PortalRole, string> = {
  Doctor: "Physician",
  Nurse: "Nurse",
  Pharmacist: "Pharmacist",
  Billing: "Billing Staff",
  IT: "System Administrator",
};

const DEPARTMENT_FOR_PORTAL: Record<PortalRole, string> = {
  Doctor: "Internal Medicine",
  Nurse: "Medical Ward",
  Pharmacist: "Pharmacy",
  Billing: "Billing",
  IT: "IT Department",
};

// Same Dr./RN prefix rule as the web app's formatDisplayName
function displayName(rawName: string, role: PortalRole) {
  const name = rawName.trim();
  if (role === "Doctor" && !name.toLowerCase().startsWith("dr.")) return `Dr. ${name}`;
  if (role === "Nurse" && !name.toLowerCase().startsWith("rn ")) return `RN ${name}`;
  return name;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly staff: StaffRepository,
    private readonly bus: EventBus,
  ) {}

  // A named account signs in with its own password. Anyone else can use the
  // portal's prototype password from the login screen and gets a session
  // under the name they typed, tied to the portal's demo account ID so the
  // audit trail still points at a real row.
  // TODO(Phase 10): drop the prototype fallback once every tester has a named account.
  async login({ role, name, password }: LoginDto) {
    const account = await this.staff.findByPortalAndName(role, name);

    if (account) {
      if (account.status !== "Active") throw new UnauthorizedException("This account is deactivated.");
      if (!(await this.passwordMatches(account, password))) {
        throw new UnauthorizedException("Incorrect password for this portal.");
      }
      return this.startSession(account, { id: account.id, name: account.name, role });
    }

    const prototype = await this.staff.findPrototypeAccount(role);
    if (!prototype || !(await this.passwordMatches(prototype, password))) {
      throw new UnauthorizedException("Incorrect password for this portal.");
    }
    return this.startSession(prototype, { id: prototype.id, name: displayName(name, role), role });
  }

  async signup({ role, name, license, password }: SignupDto) {
    const fullName = displayName(name, role);
    if (await this.staff.findByPortalAndName(role, fullName)) {
      throw new ConflictException("There's already an account with that name on this portal.");
    }
    const account = await this.staff.create({
      name: fullName,
      hospitalRole: HOSPITAL_ROLE_FOR_PORTAL[role],
      portal: role,
      department: DEPARTMENT_FOR_PORTAL[role],
      license,
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
    });
    return this.startSession(account!, { id: account!.id, name: account!.name, role });
  }

  async refresh(refreshToken: string) {
    let user: AuthUser;
    try {
      user = verifyToken(refreshToken, "refresh");
    } catch {
      throw new UnauthorizedException("Session expired. Please sign in again.");
    }
    // a deactivated account shouldn't keep a week-long session alive
    const account = await this.staff.findById(user.id);
    if (!account || account.status !== "Active") throw new UnauthorizedException("This account is deactivated.");
    return { user, ...signTokens(user) };
  }

  private async passwordMatches(account: StaffRow, password: string) {
    if (!account.password_hash) return false;
    return argon2.verify(account.password_hash, password);
  }

  private async startSession(account: StaffRow, user: AuthUser) {
    await this.staff.touchLastLogin(account.id);
    this.bus.publish(EVENT_TYPES.staffLoggedIn, { staffId: account.id, role: user.role }, user);
    return { user, ...signTokens(user) };
  }
}
