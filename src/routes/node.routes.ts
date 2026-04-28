import { Router } from "express";
import { NodeController } from "../controllers/node.controller";
import { validate } from "../middleware/validate.middleware";
import type { NodeService } from "../services/node.service";
import { asyncHandler } from "../utils/async-handler";
import { registerNodeSchema } from "./schemas";

export function nodeRoutes(nodeService: NodeService): Router {
  const router = Router();
  const controller = new NodeController(nodeService);

  router.post("/", validate({ body: registerNodeSchema }), asyncHandler(controller.register));
  router.get("/", asyncHandler(controller.list));

  return router;
}

