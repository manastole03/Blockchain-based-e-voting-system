import fs from "fs";
import path from "path";
import { pool } from "../config/database";
import { logger } from "../config/logger";

export async function runMigrations(): Promise<void> {
  const schemaPath = path.resolve(process.cwd(), "database", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  await pool.query(schema);
  logger.info({ schemaPath }, "Database schema applied");
}

if (require.main === module) {
  runMigrations()
    .then(async () => {
      await pool.end();
    })
    .catch(async (error) => {
      logger.error({ error }, "Database migration failed");
      await pool.end();
      process.exit(1);
    });
}

