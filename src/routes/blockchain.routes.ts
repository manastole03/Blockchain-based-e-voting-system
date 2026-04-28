import { Router } from "express";
import { BlockchainController } from "../controllers/blockchain.controller";
import { validate } from "../middleware/validate.middleware";
import type { BlockchainService } from "../services/blockchain.service";
import { asyncHandler } from "../utils/async-handler";
import { blockIdentifierParamsSchema, mineBlockSchema } from "./schemas";

export function blockchainRoutes(blockchainService: BlockchainService): Router {
  const router = Router();
  const controller = new BlockchainController(blockchainService);

  router.post("/blocks/mine", validate({ body: mineBlockSchema }), asyncHandler(controller.mine));
  router.get("/blockchain", asyncHandler(controller.chain));
  router.get(
    "/blocks/:identifier",
    validate({ params: blockIdentifierParamsSchema }),
    asyncHandler(controller.block)
  );
  router.get("/blockchain/validate", asyncHandler(controller.validate));
  router.get("/consensus", controller.consensus);

  return router;
}

