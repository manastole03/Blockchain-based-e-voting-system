import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

export async function closeDatabase(): Promise<void> {
  await pool.end();
}

