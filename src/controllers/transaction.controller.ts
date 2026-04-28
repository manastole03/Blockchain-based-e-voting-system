import type { Request, Response } from "express";
import type { BlockchainRepository } from "../repositories/blockchain.repository";
import type { TransactionService } from "../services/transaction.service";
import { AppError } from "../utils/app-error";
import { created, ok } from "../utils/http-response";

export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly repository: BlockchainRepository
  ) {}

  sign = async (req: Request, res: Response): Promise<Response> => {
    const { privateKey, ...input } = req.body;
    const payload = this.transactionService.buildUnsignedPayload(input);
    const signed = this.transactionService.sign(payload, privateKey);
    return ok(res, signed);
  };

  create = async (req: Request, res: Response): Promise<Response> => {
    const payload = this.transactionService.buildUnsignedPayload(req.body);
    const transaction = await this.transactionService.create({
      ...payload,
      signature: req.body.signature,
      publicKey: req.body.publicKey,
    });
    return created(res, transaction);
  };

  validate = async (req: Request, res: Response): Promise<Response> => {
    if ("hash" in req.body) {
      const transaction = await this.repository.getTransactionByHash(req.body.hash);
      if (!transaction) {
        throw new AppError(404, "TRANSACTION_NOT_FOUND", "Transaction was not found");
      }

      return ok(res, await this.transactionService.validate(transaction));
    }

    const payload = this.transactionService.buildUnsignedPayload(req.body);
    return ok(
      res,
      await this.transactionService.validateInput({
        ...payload,
        signature: req.body.signature,
        publicKey: req.body.publicKey,
      })
    );
  };

  pending = async (_req: Request, res: Response): Promise<Response> => {
    const transactions = await this.repository.getPendingTransactions(500);
    return ok(res, { transactions });
  };
}
