import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { getPglite } from "../../lib/db.ts";
import { pgliteDialect } from "../../lib/auth/pglite-dialect.ts";
import type { Database } from "./types";

const globalDbRef = globalThis as typeof globalThis & {
  __kyselyDbInstance__?: Kysely<Database>;
};

export const SUPABASE_DATABASE_URL =
  "postgresql://postgres.zvcebipompkisahakzpw:a6MbMsdpOgxTnCIW@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres";

export function getDb(): Kysely<Database> {
  let databaseUrl = process.env.DATABASE_URL?.trim() || SUPABASE_DATABASE_URL;
  if (databaseUrl.includes("db.zvcebipompkisahakzpw.supabase.co")) {
    databaseUrl = databaseUrl
      .replace("db.zvcebipompkisahakzpw.supabase.co:5432", "aws-0-ap-southeast-2.pooler.supabase.com:5432")
      .replace("://postgres:", "://postgres.zvcebipompkisahakzpw:");
  }


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
