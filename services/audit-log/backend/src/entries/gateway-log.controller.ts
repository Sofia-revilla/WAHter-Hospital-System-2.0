import { Body, Controller, ForbiddenException, Headers, HttpCode, Post } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Public, verifyToken } from "@wahter/shared";
import { roleLabel } from "./audit.consumer";
import { EntriesRepository } from "./entries.repository";

// US-41: denied access. A call Kong turns away (no token, a bad token, or the
// wrong role for that route) never reaches a service, so the service can't
// log it. Kong's http-log plugin batches every request to this endpoint; we
// keep only the 401s and 403s and drop the rest.
//
// Not routed through Kong (there's no route for /internal), so only Kong on
// the Docker network can reach it, and it also has to show the shared secret.

interface KongLogEntry {
  request?: { method?: string; uri?: string; headers?: Record<string, string | string[] | undefined> };
  response?: { status?: number };
  service?: { name?: string };
  client_ip?: string;
  started_at?: number;
}

function header(entry: KongLogEntry, name: string) {
  const value = entry.request?.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

@ApiExcludeController()
@Controller("internal")
export class GatewayLogController {
  constructor(private readonly entries: EntriesRepository) {}

  @Public()
  @HttpCode(204)
  @Post("gateway-log")
  async ingest(@Headers("x-gateway-secret") secret: string | undefined, @Body() body: KongLogEntry | KongLogEntry[]) {
    if (!process.env.GATEWAY_LOG_SECRET || secret !== process.env.GATEWAY_LOG_SECRET) {
      throw new ForbiddenException();
    }
    const batch = Array.isArray(body) ? body : [body];
    for (const entry of batch) {
      const status = entry.response?.status;
      if (status !== 401 && status !== 403) continue;
      await this.entries.append({
        eventId: null,
        eventType: "gateway.request.denied",
        source: "kong",
        ...this.actorOf(entry),
        action: "ACCESS_DENIED",
        outcome: "Denied",
        // the path only; query strings can carry search terms we don't want here
        resource: `${entry.request?.method ?? "?"} ${(entry.request?.uri ?? "?").split("?")[0]} (${status} at the gateway)`,
        occurredAt: new Date(entry.started_at ?? Date.now()).toISOString(),
      });
    }
  }

  // The token is read only to say who it was, then dropped; it's never stored
  private actorOf(entry: KongLogEntry) {
    const [, token] = (header(entry, "authorization") ?? "").split(" ");
    if (token) {
      try {
        const user = verifyToken(token, "access");
        return { actorId: user.id, actorName: user.name, actorRole: roleLabel(user.role) };
      } catch {
        return { actorId: null, actorName: `Invalid token (${entry.client_ip ?? "unknown IP"})`, actorRole: "Unknown" };
      }
    }
    return { actorId: null, actorName: `No token (${entry.client_ip ?? "unknown IP"})`, actorRole: "Unknown" };
  }
}
