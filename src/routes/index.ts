import { Router } from "express";
import type { BlockchainRepository } from "../repositories/blockchain.repository";
import type { BlockchainService } from "../services/blockchain.service";
import type { NodeService } from "../services/node.service";
import type { TransactionService } from "../services/transaction.service";
import type { ValidatorService } from "../services/validator.service";
import type { WalletService } from "../services/wallet.service";
import { blockchainRoutes } from "./blockchain.routes";
import { healthRoutes } from "./health.routes";
import { nodeRoutes } from "./node.routes";
import { transactionRoutes } from "./transaction.routes";
import { validatorRoutes } from "./validator.routes";
import { walletRoutes } from "./wallet.routes";

export interface RouteServices {
  repository: BlockchainRepository;
  blockchainService: BlockchainService;
  walletService: WalletService;
  transactionService: TransactionService;
  nodeService: NodeService;
  validatorService: ValidatorService;
}

export function apiRoutes(services: RouteServices): Router {
  const router = Router();

  router.use("/health", healthRoutes());
  router.use("/wallets", walletRoutes(services.walletService));
  router.use(
    "/transactions",
    transactionRoutes(services.transactionService, services.repository)
  );
  router.use("/", blockchainRoutes(services.blockchainService));
  router.use("/nodes", nodeRoutes(services.nodeService));
  router.use("/validators", validatorRoutes(services.validatorService));

  return router;
}

