import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { runMigrations } from "./database/migrate";

async function start(): Promise<void> {
  if (env.AUTO_MIGRATE) {
    await runMigrations();
  }

  const { app } = await createApp();

  app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        apiPrefix: env.API_PREFIX,
        consensus: env.CONSENSUS_ALGORITHM,
      },
      "Blockchain backend started"
    );
  });
}

start().catch((error) => {
  logger.fatal({ error }, "Failed to start backend");
  process.exit(1);
});

