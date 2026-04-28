import { randomUUID } from "crypto";
import type {
  Transaction,
  TransactionType,
  UnsignedTransactionPayload,
} from "../models/blockchain.types";
import type { BlockchainRepository } from "../repositories/blockchain.repository";
import { AppError } from "../utils/app-error";
import {
  addressFromPublicKey,
  hashTransactionPayload,
  publicKeyFromPrivateKey,
  signTransactionPayload,
  transactionSigningPayload,
  verifyTransactionSignature,
} from "../utils/crypto";

export interface TransactionValidationResult {
  valid: boolean;
  errors: string[];
  transactionHash: string;
}

export interface CreateTransactionInput extends UnsignedTransactionPayload {
  signature: string | null;
  publicKey: string | null;
}

export class TransactionService {
  constructor(private readonly repository: BlockchainRepository) {}

  buildUnsignedPayload(input: {
    type: TransactionType;
    fromAddress?: string | null;
    toAddress?: string | null;
    amount?: number;
    payload?: Record<string, unknown>;
    nonce?: number;
    timestamp?: string;
  }): UnsignedTransactionPayload {
    return transactionSigningPayload({
      type: input.type,
      fromAddress: input.fromAddress ?? null,
      toAddress: input.toAddress ?? null,
      amount: input.amount ?? 0,
      payload: input.payload ?? {},
      nonce: input.nonce ?? Date.now(),
      timestamp: input.timestamp ?? new Date().toISOString(),
    });
  }

  sign(input: UnsignedTransactionPayload, privateKey: string) {
    let publicKey: string;
    let address: string;

    try {
      publicKey = publicKeyFromPrivateKey(privateKey);
      address = addressFromPublicKey(publicKey);
    } catch {
      throw new AppError(400, "INVALID_PRIVATE_KEY", "privateKey is not a valid PEM private key");
    }

    const payload = transactionSigningPayload({
      ...input,
      fromAddress: input.fromAddress ?? address,
    });
    const signed = signTransactionPayload(payload, privateKey);

    if (input.fromAddress && input.fromAddress !== address) {
      throw new AppError(
        400,
        "PRIVATE_KEY_ADDRESS_MISMATCH",
        "Private key does not match fromAddress"
      );
    }

    return {
      transactionHash: signed.hash,
      signature: signed.signature,
      publicKey: signed.publicKey,
      fromAddress: signed.address,
      signingPayload: payload,
    };
  }

  async create(input: CreateTransactionInput): Promise<Transaction> {
    const transaction = this.toTransaction(input, "PENDING");
    const existing = await this.repository.getTransactionByHash(transaction.hash);

    if (existing) {
      throw new AppError(409, "TRANSACTION_ALREADY_EXISTS", "Transaction already exists");
    }

    const validation = await this.validate(transaction, { checkBalance: true });

    if (!validation.valid) {
      throw new AppError(422, "INVALID_TRANSACTION", "Transaction validation failed", validation);
    }

    return this.repository.createTransaction(transaction);
  }

  async validate(
    transaction: Transaction,
    options: { checkBalance: boolean } = { checkBalance: true }
  ): Promise<TransactionValidationResult> {
    const errors: string[] = [];
    const signingPayload = this.signingPayloadFromTransaction(transaction);
    const transactionHash = hashTransactionPayload(signingPayload);

    if (transaction.hash !== transactionHash) {
      errors.push("Transaction hash does not match transaction payload");
    }

    if (transaction.amount < 0) {
      errors.push("Transaction amount cannot be negative");
    }

    if (transaction.type === "REWARD") {
      if (transaction.fromAddress !== null) {
        errors.push("Reward transactions must not have a fromAddress");
      }
      return { valid: errors.length === 0, errors, transactionHash };
    }

    if (!transaction.fromAddress) {
      errors.push("fromAddress is required");
    }

    if (!transaction.publicKey) {
      errors.push("publicKey is required");
    }

    if (!transaction.signature) {
      errors.push("signature is required");
    }

    if (transaction.publicKey && transaction.fromAddress) {
      const address = addressFromPublicKey(transaction.publicKey);
      if (address !== transaction.fromAddress) {
        errors.push("publicKey does not match fromAddress");
      }

      const wallet = await this.repository.getWallet(transaction.fromAddress);
      if (!wallet) {
        errors.push("fromAddress is not a registered wallet");
      }
    }

    if (transaction.publicKey && transaction.signature) {
      const verified = verifyTransactionSignature({
        payload: signingPayload,
        publicKey: transaction.publicKey,
        signature: transaction.signature,
      });

      if (!verified) {
        errors.push("Invalid transaction signature");
      }
    }

    if (transaction.type === "TRANSFER" && !transaction.toAddress) {
      errors.push("toAddress is required for transfer transactions");
    }

    if (transaction.type === "VOTE") {
      if (!transaction.payload.electionId || !transaction.payload.candidateId) {
        errors.push("Vote transactions require payload.electionId and payload.candidateId");
      }
    }

    if (options.checkBalance && transaction.type === "TRANSFER" && transaction.fromAddress) {
      const balance = await this.repository.getBalance(transaction.fromAddress);
      if (balance.available < transaction.amount) {
        errors.push("Insufficient available balance");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      transactionHash,
    };
  }

  async validateInput(input: CreateTransactionInput): Promise<TransactionValidationResult> {
    return this.validate(this.toTransaction(input, "PENDING"));
  }

  createRewardTransaction(toAddress: string, amount: number): Transaction {
    const timestamp = new Date().toISOString();
    const unsigned = this.buildUnsignedPayload({
      type: "REWARD",
      fromAddress: null,
      toAddress,
      amount,
      payload: { reason: "block-reward" },
      nonce: Date.now() + Math.floor(Math.random() * 1_000_000),
      timestamp,
    });
    const hash = hashTransactionPayload(unsigned);

    return {
      id: randomUUID(),
      hash,
      ...unsigned,
      signature: null,
      publicKey: null,
      status: "PENDING",
      blockHash: null,
      rejectionReason: null,
      createdAt: timestamp,
      confirmedAt: null,
    };
  }

  private toTransaction(
    input: CreateTransactionInput,
    status: Transaction["status"]
  ): Transaction {
    const unsigned = transactionSigningPayload(input);
    const hash = hashTransactionPayload(unsigned);

    return {
      id: randomUUID(),
      hash,
      ...unsigned,
      signature: input.signature,
      publicKey: input.publicKey,
      status,
      blockHash: null,
      rejectionReason: null,
      createdAt: unsigned.timestamp,
      confirmedAt: null,
    };
  }

  private signingPayloadFromTransaction(transaction: Transaction): UnsignedTransactionPayload {
    return transactionSigningPayload({
      type: transaction.type,
      fromAddress: transaction.fromAddress,
      toAddress: transaction.toAddress,
      amount: transaction.amount,
      payload: transaction.payload,
      nonce: transaction.nonce,
      timestamp: transaction.timestamp,
    });
  }
}
