import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

// One Postgres instance, one schema per service (paper TABLE IX). Each
// service logs in as its own database user whose search_path is its schema
// and who has no grants anywhere else (see infra/postgres/init), so a
// service physically can't read another service's tables. That's what keeps
// them talking over REST and the bus instead of joining across schemas.

const CONNECT_ATTEMPTS = 30;
const RETRY_DELAY_MS = 2000;

export interface DatabaseOptions {
  connectionString: string;
  // folder with numbered .sql files (001_init.sql, 002_...) plus an optional seed.sql
  migrationsDir: string;
  // seed.sql runs once, on an empty database, and only when this is true
  seed: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class Database {
  private readonly pool: Pool;

  constructor(private readonly options: DatabaseOptions) {
    this.pool = new Pool({ connectionString: options.connectionString, max: 5 });
  }

  // Compose starts every container at once, so Postgres may still be booting
  async connect() {
    for (let attempt = 1; ; attempt++) {
      try {
        const client = await this.pool.connect();
        client.release();
        break;
      } catch (error) {
        if (attempt >= CONNECT_ATTEMPTS) throw error;
        await sleep(RETRY_DELAY_MS);
      }
    }
    await this.migrate();
  }

  async query<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.pool.query<T>(sql, params);
    return result.rows;
  }

  async one<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  // For writes that must happen together, e.g. the bed lock and the
  // admission row in UC-04. Rolls back on any throw.
  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async isHealthy() {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  async close() {
    await this.pool.end();
  }

  // Plain numbered SQL files instead of an ORM migration tool. Eight
  // services with a handful of tables each didn't justify the extra layer.
  private async migrate() {
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    // every service gets this so its bus consumers can skip redelivered events
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS processed_events (
         event_id uuid PRIMARY KEY,
         processed_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    const applied = new Set(
      (await this.query<{ name: string }>("SELECT name FROM schema_migrations")).map((row) => row.name),
    );
    const isFreshDatabase = applied.size === 0;

    const files = readdirSync(this.options.migrationsDir)
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      await this.runFile(file);
    }

    const seedPath = join(this.options.migrationsDir, "seed.sql");
    if (this.options.seed && isFreshDatabase && existsSync(seedPath)) {
      await this.runFile("seed.sql");
    }
  }

  private async runFile(file: string) {
    const sql = readFileSync(join(this.options.migrationsDir, file), "utf8");
    await this.transaction(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    });
  }
}
