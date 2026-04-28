import { Router } from "express";
import { WalletController } from "../controllers/wallet.controller";
import type { WalletService } from "../services/wallet.service";
import { asyncHandler } from "../utils/async-handler";
import { validate } from "../middleware/validate.middleware";
import { addressParamsSchema, walletCreateSchema } from "./schemas";

export function walletRoutes(walletService: WalletService): Router {
  const router = Router();
  const controller = new WalletController(walletService);

  router.post("/", validate({ body: walletCreateSchema }), asyncHandler(controller.create));
  router.get(
    "/:address/balance",
    validate({ params: addressParamsSchema }),
    asyncHandler(controller.balance)
  );

  return router;
}

