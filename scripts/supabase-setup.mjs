// One-time setup for running the services' databases on Supabase
// (npm run supabase:setup). Does on Supabase what
// infra/postgres/init/01-service-schemas.sh does for the local container:
// one schema and one login per service, each login only able to see its own
// schema. Safe to run again; it skips what already exists and resets the passwords.
//
// Reads SUPABASE_DB_URL (the Session pooler URI from Supabase → Connect) from
// .env and writes the pooler host, project ref, and a random password per
// service back into .env. Nothing here is committed.

import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

const ENV_FILE = new URL("../.env", import.meta.url);

const SERVICES = [
  ["identity", "identity"],
  ["clinical-records", "clinical"],
  ["scheduling", "scheduling"],
  ["orders-diagnostics", "orders"],
  ["billing", "billing"],
  ["interoperability", "interop"],
  ["notifications", "notifications"],
  ["audit-log", "audit"],
];

const roleFor = (service) => `${service.replace(/-/g, "_")}_svc`;
const passwordKeyFor = (service) => `SUPABASE_${service.toUpperCase().replace(/-/g, "_")}_DB_PASSWORD`;

function readEnv() {
  const text = readFileSync(ENV_FILE, "utf8");
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2];
  }
  return { text, values };
}

// Replaces KEY=... if it's there, appends it if not
function setEnv(text, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  return pattern.test(text) ? text.replace(pattern, line) : `${text.trimEnd()}\n${line}\n`;
}

const { text: envText, values: env } = readEnv();
const adminUrl = env.SUPABASE_DB_URL;
if (!adminUrl) {
  console.error("Add SUPABASE_DB_URL to .env first (Supabase → Connect → Session pooler). See the README.");
  process.exit(1);
}

const parsed = new URL(adminUrl);
// Session pooler usernames look like postgres.<project-ref>
const [, projectRef] = decodeURIComponent(parsed.username).split(".");
if (!projectRef || !parsed.hostname.includes("pooler.supabase.com")) {
  console.error("SUPABASE_DB_URL should be the Session pooler URI (user postgres.<ref>, host *.pooler.supabase.com).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: adminUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

let nextEnv = envText;
nextEnv = setEnv(nextEnv, "SUPABASE_PROJECT_REF", projectRef);
nextEnv = setEnv(nextEnv, "SUPABASE_POOLER_HOST", parsed.hostname);

for (const [service, schema] of SERVICES) {
  const role = roleFor(service);
  // hex only, so it's safe inside the connection URL and the SQL literal below
  const password = randomBytes(24).toString("hex");

  const exists = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role]);
  if (exists.rowCount === 0) {
    await client.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}'`);
  } else {
    await client.query(`ALTER ROLE ${role} WITH LOGIN PASSWORD '${password}'`);
  }
  // postgres needs to be a member to hand the schema over; harmless if it already is
  await client.query(`GRANT ${role} TO postgres`).catch(() => undefined);
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema} AUTHORIZATION ${role}`);
  await client.query(`ALTER ROLE ${role} SET search_path = ${schema}`);

  nextEnv = setEnv(nextEnv, passwordKeyFor(service), password);
  console.log(`  ${service}: schema "${schema}", login ${role}`);
}

await client.end();
writeFileSync(ENV_FILE, nextEnv);
console.log("\nSupabase is ready. Start the stack on it with: npm run up:supabase");
