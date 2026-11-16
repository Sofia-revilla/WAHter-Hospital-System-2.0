// A stand-in for the external WAH Systems endpoint, for local testing only.
// The real one isn't available to us (paper Limitation c: no live national
// integration), so this accepts FHIR Patient resources the way a receiving
// system would: it checks the token and the basics, keeps what it got in
// memory, and answers 201 with its own ID.
//
//   docker compose stop wah-systems-mock    → WAHter keeps the exchange Pending
//   docker compose start wah-systems-mock   → the retry sends it
//   http://localhost:8090/received          → what arrived
//
// No dependencies, so it runs on the plain node image.

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT ?? 8090);
const TOKEN = process.env.MOCK_TOKEN ?? "";
const received = [];

function send(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/fhir+json" });
  response.end(JSON.stringify(body));
}

function outcome(code, diagnostics) {
  return { resourceType: "OperationOutcome", issue: [{ severity: "error", code, diagnostics }] };
}

createServer((request, response) => {
  if (request.method === "GET" && request.url === "/received") {
    return send(response, 200, received.slice(-50).reverse());
  }
  if (request.method === "GET" && request.url === "/health") return send(response, 200, { status: "up" });
  if (request.method !== "POST" || request.url !== "/fhir/Patient") return send(response, 404, outcome("not-found", "No such endpoint"));

  // US-46: only authorised systems may exchange data
  if (!TOKEN || request.headers.authorization !== `Bearer ${TOKEN}`) {
    return send(response, 401, outcome("security", "Missing or wrong credentials"));
  }

  let raw = "";
  request.on("data", (chunk) => {
    raw += chunk;
  });
  request.on("end", () => {
    let resource;
    try {
      resource = JSON.parse(raw);
    } catch {
      return send(response, 400, outcome("invalid", "Body isn't JSON"));
    }
    if (resource.resourceType !== "Patient" || !Array.isArray(resource.identifier) || resource.identifier.length === 0) {
      return send(response, 422, outcome("invalid", "Expected a Patient with at least one identifier"));
    }
    const id = `WAHSYS-${randomUUID().slice(0, 8)}`;
    received.push({ id, receivedAt: new Date().toISOString(), mpi: resource.id, resource });
    console.log(`[wah-systems-mock] received Patient ${resource.id} as ${id}`);
    send(response, 201, { resourceType: "Patient", id, meta: { source: "wah-systems-mock" } });
  });
}).listen(PORT, () => console.log(`[wah-systems-mock] listening on :${PORT}`));
