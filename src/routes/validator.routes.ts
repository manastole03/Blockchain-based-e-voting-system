import { Router } from "express";
import { ValidatorController } from "../controllers/validator.controller";
import { validate } from "../middleware/validate.middleware";
import type { ValidatorService } from "../services/validator.service";
import { asyncHandler } from "../utils/async-handler";
import { registerValidatorSchema } from "./schemas";

export function validatorRoutes(validatorService: ValidatorService): Router {
  const router = Router();
  const controller = new ValidatorController(validatorService);

  router.post("/", validate({ body: registerValidatorSchema }), asyncHandler(controller.register));
  router.get("/", asyncHandler(controller.list));

  return router;
}

