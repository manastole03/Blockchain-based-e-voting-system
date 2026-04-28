import type { Request, Response } from "express";
import type { WalletService } from "../services/wallet.service";
import { created, ok } from "../utils/http-response";

export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  create = async (req: Request, res: Response): Promise<Response> => {
    const wallet = await this.walletService.createWallet(req.body.label);
    return created(res, wallet);
  };

  balance = async (req: Request, res: Response): Promise<Response> => {
    const balance = await this.walletService.getBalance(req.params.address);
    return ok(res, balance);
  };
}

