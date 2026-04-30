import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env, type EnvConfig } from "./config/env";
import { logger } from "./config/logger";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { apiRateLimiter } from "./middleware/rate-limit.middleware";
import type { BlockchainRepository } from "./repositories/blockchain.repository";
import { pool } from "./config/database";
import { PostgresBlockchainRepository } from "./repositories/postgres.repository";
import { BlockchainService } from "./services/blockchain.service";
import { NodeService } from "./services/node.service";
import { TransactionService } from "./services/transaction.service";
import { ValidatorService } from "./services/validator.service";
import { WalletService } from "./services/wallet.service";
import { apiRoutes } from "./routes";

export interface AppOptions {
  repository?: BlockchainRepository;
  config?: EnvConfig;
  initializeChain?: boolean;
}

export async function createApp(options: AppOptions = {}) {
  const config = options.config ?? env;
  const repository = options.repository ?? new PostgresBlockchainRepository(pool);
  const transactionService = new TransactionService(repository);
  const blockchainService = new BlockchainService(repository, transactionService, config);
  const walletService = new WalletService(repository);
  const nodeService = new NodeService(repository);
  const validatorService = new ValidatorService(repository);

  if (options.initializeChain !== false) {
    await blockchainService.initialize();
  }

  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN === "*" ? true : config.CORS_ORIGIN.split(","),
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: config.NODE_ENV !== "test",
    })
  );
  app.use(apiRateLimiter);
  app.use(
    config.API_PREFIX,
    apiRoutes({
      repository,
      blockchainService,
      walletService,
      transactionService,
      nodeService,
      validatorService,
    })
  );
  app.use(notFoundHandler);
  app.use(errorHandler);

  return {
    app,
    services: {
      repository,
      blockchainService,
      walletService,
      transactionService,
      nodeService,
      validatorService,
    },
  };
}

