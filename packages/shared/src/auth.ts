import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import jwt from "jsonwebtoken";
import { EventBus } from "./event-bus";
import { requestDeniedEvent } from "./events";
import type { StaffRole } from "./roles";

// Access & Provider Registry signs the tokens; Kong checks the signature and
// the role at the edge, and every service checks both again here. The second
// check matters because services are also reachable inside the Docker
// network, where Kong isn't in the way.

export const TOKEN_ISSUER = "wahter-access";

export const ACCESS_TOKEN_TTL = "8h";
export const REFRESH_TOKEN_TTL = "7d";

// Kong's JWT plugin finds the consumer by this claim. There's one Kong
// consumer per role ("role-physician", ...) and each sits in an ACL group
// named after the role, which is how Kong rejects a wrong role on a route
// (infra/kong/routes.mjs).
export const KONG_KEY_CLAIM = "rk";

export function kongKeyForRole(role: StaffRole) {
  return `role-${role.toLowerCase()}`;
}

// "System" is a service calling another service inside the Docker network
// (for example Pharmacy checking a patient ID with the Patient Registry).
// Only signServiceToken() makes these; no login can.
export type CallerRole = StaffRole | "System";

export interface AuthUser {
  id: string;
  name: string;
  role: CallerRole;
}

interface TokenClaims extends AuthUser {
  kind: "access" | "refresh";
}

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not set");
  return value;
}

export function signTokens(user: AuthUser & { role: StaffRole }) {
  const base = { id: user.id, name: user.name, role: user.role, [KONG_KEY_CLAIM]: kongKeyForRole(user.role) };
  return {
    accessToken: jwt.sign({ ...base, kind: "access" }, secret(), {
      issuer: TOKEN_ISSUER,
      subject: user.id,
      expiresIn: ACCESS_TOKEN_TTL,
    }),
    refreshToken: jwt.sign({ ...base, kind: "refresh" }, secret(), {
      issuer: TOKEN_ISSUER,
      subject: user.id,
      expiresIn: REFRESH_TOKEN_TTL,
    }),
  };
}

// Short-lived token for one service calling another directly on the Docker
// network. Five minutes is plenty for a single request. It has no Kong key,
// so Kong would refuse it: it only works service to service.
export function signServiceToken(serviceName: string) {
  const user: AuthUser = { id: `svc:${serviceName}`, name: serviceName, role: "System" };
  return jwt.sign({ ...user, kind: "access" }, secret(), {
    issuer: TOKEN_ISSUER,
    subject: user.id,
    expiresIn: "5m",
  });
}

export function verifyToken(token: string, kind: TokenClaims["kind"]): AuthUser {
  const claims = jwt.verify(token, secret(), { issuer: TOKEN_ISSUER }) as TokenClaims;
  // a refresh token must not work as an access token, or the 8h limit means nothing
  if (claims.kind !== kind) throw new Error("wrong token kind");
  return { id: claims.id, name: claims.name, role: claims.role };
}

const IS_PUBLIC = "wah:isPublic";
const ROLES = "wah:roles";
// the compose service name, provided by WahServiceModule
export const SERVICE_NAME = "WAH_SERVICE_NAME";

// Endpoints anyone can call: /health, login, and token refresh
export const Public = () => SetMetadata(IS_PUBLIC, true);

// Which roles may call an endpoint, taken from the use case actors
export const Roles = (...roles: CallerRole[]) => SetMetadata(ROLES, roles);

interface RequestWithUser {
  method: string;
  url: string;
  headers: Record<string, string | undefined>;
  user?: AuthUser;
}

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  return context.switchToHttp().getRequest<RequestWithUser>().user;
});

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    // optional so the guard still works in a unit test without a bus
    @Optional() private readonly bus?: EventBus,
    @Optional() @Inject(SERVICE_NAME) private readonly serviceName?: string,
  ) {}

  canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const header = request.headers.authorization ?? "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) throw new UnauthorizedException("Missing bearer token");

    try {
      request.user = verifyToken(token, "access");
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const allowed = this.reflector.getAllAndOverride<string[] | undefined>(ROLES, targets);
    if (allowed && !allowed.includes(request.user.role)) {
      // US-41: denied access goes to the audit trail. Calls with no token at
      // all are logged at Kong instead, since they never reach a service.
      this.bus?.publish(
        requestDeniedEvent(this.serviceName ?? "unknown"),
        {
          method: request.method,
          path: request.url.split("?")[0],
          status: 403,
          reason: `${request.user.role} isn't allowed here`,
        },
        request.user,
      );
      throw new ForbiddenException(`${request.user.role} can't do this`);
    }
    return true;
  }
}
