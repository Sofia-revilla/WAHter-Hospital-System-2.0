import { signServiceToken } from "./auth";

// Direct REST calls from one service to another inside the Docker network,
// for the few places where a reference ID has to be checked or shown with
// its details (comment matrix 7: services link through IDs and their APIs,
// never through each other's tables). The caller signs a short-lived
// "System" token, so the receiving service's guard still runs.
//
// The base URL follows the compose service name: http://<name>:3000/api/<name>.
// Set <NAME>_URL (e.g. PATIENT_REGISTRY_URL) to point somewhere else.

const REQUEST_TIMEOUT_MS = 3000;

export class ServiceUnavailableError extends Error {
  constructor(readonly service: string) {
    super(`${service} is unavailable`);
  }
}

function baseUrl(service: string) {
  const override = process.env[`${service.toUpperCase().replace(/-/g, "_")}_URL`];
  return override ?? `http://${service}:3000/api/${service}`;
}

export class ServiceClient {
  constructor(private readonly caller: string) {}

  // null on 404, so "no such record" and "service down" stay different answers
  async get<T>(service: string, path: string): Promise<T | null> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl(service)}${path}`, {
        headers: { Authorization: `Bearer ${signServiceToken(this.caller)}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableError(service);
    }
    if (response.status === 404) return null;
    if (!response.ok) {
      if (response.status >= 500) throw new ServiceUnavailableError(service);
      throw new Error(`${service} answered ${response.status} for ${path}`);
    }
    return (await response.json()) as T;
  }
}
