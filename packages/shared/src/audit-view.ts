import {
  Inject,
  Injectable,
  SetMetadata,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { tap } from "rxjs";
import type { AuthUser } from "./auth";
import { SERVICE_NAME } from "./auth";
import { EventBus } from "./event-bus";
import { recordViewedEvent } from "./events";

// US-41: viewing a clinical or financial record goes to the audit trail.
// Put @AuditView on the endpoints that open one record (a chart, an
// account), not on the lists the screens re-read every few seconds, or the
// trail would fill with polling noise.
//
// The same person opening the same record again within VIEW_DEDUPE_MS counts
// as one view, so a screen that refreshes doesn't log it over and over.

const AUDIT_VIEW = "wah:auditView";
const VIEW_DEDUPE_MS = 5 * 60_000;

export interface AuditViewOptions {
  // what kind of record, shown in the audit trail, e.g. "Patient chart"
  record: string;
  // where the record's ID is: a route param, else a query param of the same name
  idParam: string;
  // set when the record ID is itself the patient's MPI number
  isPatientId?: boolean;
}

export const AuditView = (options: AuditViewOptions) => SetMetadata(AUDIT_VIEW, options);

interface ViewRequest {
  params?: Record<string, string>;
  query?: Record<string, string | undefined>;
  user?: AuthUser;
}

@Injectable()
export class AuditViewInterceptor implements NestInterceptor {
  private readonly lastLogged = new Map<string, number>();

  constructor(
    private readonly reflector: Reflector,
    private readonly bus: EventBus,
    @Inject(SERVICE_NAME) private readonly serviceName: string,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const options = this.reflector.get<AuditViewOptions | undefined>(AUDIT_VIEW, context.getHandler());
    if (!options) return next.handle();

    const request = context.switchToHttp().getRequest<ViewRequest>();
    const recordId = request.params?.[options.idParam] ?? request.query?.[options.idParam];
    // only a person opening a record counts; other services resolving IDs don't
    if (!recordId || !request.user || request.user.role === "System") return next.handle();
    const user = request.user;

    // logged only once the record was actually served, so a 404 isn't a "view"
    return next.handle().pipe(
      tap(() => {
        const key = `${user.id}|${options.record}|${recordId}`;
        const now = Date.now();
        if (now - (this.lastLogged.get(key) ?? 0) < VIEW_DEDUPE_MS) return;
        this.lastLogged.set(key, now);
        this.bus.publish(
          recordViewedEvent(this.serviceName),
          { record: options.record, recordId, patientId: options.isPatientId ? recordId : undefined },
          user,
        );
      }),
    );
  }
}
