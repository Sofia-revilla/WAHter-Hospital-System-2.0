import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import jwt from "jsonwebtoken";

// Identity signs the tokens; Kong checks the signature at the edge and every
// service checks it again here. The second check matters because services are
// also reachable inside the Docker network, where Kong isn't in the way.

// Kong's JWT plugin looks up the signing key by this claim (see infra/kong)
export const TOKEN_ISSUER = "wahter-identity";

export const ACCESS_TOKEN_TTL = "8h";
export const REFRESH_TOKEN_TTL = "7d";

// The portals on the login screen. "Billing" is the paper's Billing Staff.
// The other paper roles (lab staff, registrar, ...) exist as staff accounts
// but have no portal yet.
export type PortalRole = "Doctor" | "Nurse" | "Pharmacist" | "Billing" | "IT";

// Roles an endpoint can name before their portal exists. Nobody holds these
// in a token yet, so an endpoint limited to them is closed until that portal ships.
export type FutureRole = "Laboratory Staff" | "Hospital Administrator";

export interface AuthUser {
  id: string;
  name: string;
  role: PortalRole;
}

interface TokenClaims extends AuthUser {
  kind: "access" | "refresh";
}

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not set");
  return value;
}

export function signTokens(user: AuthUser) {
  const base = { id: user.id, name: user.name, role: user.role };
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

export function verifyToken(token: string, kind: TokenClaims["kind"]): AuthUser {
  const claims = jwt.verify(token, secret(), { issuer: TOKEN_ISSUER }) as TokenClaims;
  // a refresh token must not work as an access token, or the 8h limit means nothing
  if (claims.kind !== kind) throw new Error("wrong token kind");
  return { id: claims.id, name: claims.name, role: claims.role };
}

const IS_PUBLIC = "wah:isPublic";
const ROLES = "wah:roles";

// Endpoints anyone can call: /health, login, and token refresh
export const Public = () => SetMetadata(IS_PUBLIC, true);

// Which portals may call an endpoint, taken from the use case actors
export const Roles = (...roles: (PortalRole | FutureRole)[]) => SetMetadata(ROLES, roles);

interface RequestWithUser {
  headers: Record<string, string | undefined>;
  user?: AuthUser;
}

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  return context.switchToHttp().getRequest<RequestWithUser>().user;
});

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

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
      throw new ForbiddenException(`${request.user.role} can't do this`);
    }
    return true;
  }
}
