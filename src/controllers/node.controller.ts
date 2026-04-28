import type { Request, Response } from "express";
import type { NodeService } from "../services/node.service";
import { created, ok } from "../utils/http-response";

export class NodeController {
  constructor(private readonly nodeService: NodeService) {}

  register = async (req: Request, res: Response): Promise<Response> => {
    const node = await this.nodeService.register(req.body);
    return created(res, node);
  };

  list = async (_req: Request, res: Response): Promise<Response> => {
    const nodes = await this.nodeService.list();
    return ok(res, { nodes });
  };
}

