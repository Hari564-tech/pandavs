import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { getPglite } from "../../lib/db.ts";
import { pgliteDialect } from "../../lib/auth/pglite-dialect.ts";
import type { Database } from "./types";

const globalDbRef = globalThis as typeof globalThis & {
  __kyselyDbInstance__?: Kysely<Database>;
};

export const SUPABASE_DATABASE_URL =
  "postgresql://postgres:a6MbMsdpOgxTnCIW@db.zvcebipompkisahakzpw.supabase.co:5432/postgres";

export function getDb(): Kysely<Database> {
  const databaseUrl = process.env.DATABASE_URL?.trim() || SUPABASE_DATABASE_URL;

  if (!globalDbRef.__kyselyDbInstance__) {
    if (databaseUrl) {
      const isLocal = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
      const pool = new Pool({
        connectionString: databaseUrl,
        max: 10,
        ssl: isLocal ? undefined : { rejectUnauthorized: false },
      });
      pool.on("error", (err) => {
        console.warn("[Postgres pool idle client error (suppressed)]:", err?.message || err);
      });
      globalDbRef.__kyselyDbInstance__ = new Kysely<Database>({
        dialect: new PostgresDialect({
          pool,
        }),
      });
    } else {
      globalDbRef.__kyselyDbInstance__ = new Kysely<Database>({
        dialect: pgliteDialect(() => getPglite()),
      });
    }
  }
  return globalDbRef.__kyselyDbInstance__;
}
