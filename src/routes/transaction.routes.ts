import { Router } from "express";
import { TransactionController } from "../controllers/transaction.controller";
import { validate } from "../middleware/validate.middleware";
import type { BlockchainRepository } from "../repositories/blockchain.repository";
import type { TransactionService } from "../services/transaction.service";
import { asyncHandler } from "../utils/async-handler";
import {
  createTransactionSchema,
  signTransactionSchema,
  validateTransactionSchema,
} from "./schemas";

export function transactionRoutes(
  transactionService: TransactionService,
  repository: BlockchainRepository
): Router {
  const router = Router();
  const controller = new TransactionController(transactionService, repository);

  router.post("/sign", validate({ body: signTransactionSchema }), asyncHandler(controller.sign));
  router.post("/", validate({ body: createTransactionSchema }), asyncHandler(controller.create));
  router.post(
    "/validate",
    validate({ body: validateTransactionSchema }),
    asyncHandler(controller.validate)
  );
  router.get("/pending", asyncHandler(controller.pending));

  return router;
}

