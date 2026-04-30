import type { ValidatorNode } from "../models/blockchain.types";
import type { BlockchainRepository } from "../repositories/blockchain.repository";
import { AppError } from "../utils/app-error";
import { addressFromPublicKey } from "../utils/crypto";

export class ValidatorService {
  constructor(private readonly repository: BlockchainRepository) {}

  async register(input: {
    address: string;
    publicKey: string;
    stake: number;
    nodeUrl?: string | null;
  }): Promise<ValidatorNode> {
    if (addressFromPublicKey(input.publicKey) !== input.address) {
      throw new AppError(400, "VALIDATOR_ADDRESS_MISMATCH", "publicKey does not match address");
    }

    const now = new Date().toISOString();
    const validator: ValidatorNode = {
      address: input.address,
      publicKey: input.publicKey,
      stake: input.stake,
      status: "ACTIVE",
      nodeUrl: input.nodeUrl ?? null,
      createdAt: now,
      updatedAt: now,
    };

    return this.repository.upsertValidator(validator);
  }

  async listActive(): Promise<ValidatorNode[]> {
    return this.repository.listActiveValidators();
  }
}

