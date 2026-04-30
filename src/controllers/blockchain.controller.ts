import type { Request, Response } from "express";
import type { BlockchainService } from "../services/blockchain.service";
import { created, ok } from "../utils/http-response";

export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  mine = async (req: Request, res: Response): Promise<Response> => {
    const block = await this.blockchainService.mineBlock(req.body.minerAddress);
    return created(res, block);
  };

  chain = async (_req: Request, res: Response): Promise<Response> => {
    const blocks = await this.blockchainService.listChain();
    return ok(res, { length: blocks.length, blocks });
  };

  block = async (req: Request, res: Response): Promise<Response> => {
    const block = await this.blockchainService.getBlock(req.params.identifier);
    return ok(res, block);
  };

  validate = async (_req: Request, res: Response): Promise<Response> => {
    const result = await this.blockchainService.validateChain();
    return ok(res, result);
  };

  consensus = (_req: Request, res: Response): Response => {
    return ok(res, this.blockchainService.getConsensusInfo());
  };
}

