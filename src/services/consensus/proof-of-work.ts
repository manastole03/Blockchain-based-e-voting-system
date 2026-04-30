import { randomUUID } from "crypto";
import { env } from "../../config/env";
import type { Block, ConsensusEvent } from "../../models/blockchain.types";
import type { BlockchainRepository } from "../../repositories/blockchain.repository";
import { AppError } from "../../utils/app-error";
import { calculateBlockHash } from "../../utils/block-hash";
import type { BuildBlockInput, BuiltBlock, ConsensusEngine } from "./consensus.interface";

export class ProofOfWorkConsensus implements ConsensusEngine {
  readonly name = "pow" as const;

  constructor(private readonly difficulty = env.POW_DIFFICULTY) {}

  async buildBlock(input: BuildBlockInput): Promise<BuiltBlock> {
    let nonce = 0;
    const prefix = "0".repeat(this.difficulty);
    const now = new Date().toISOString();

    while (true) {
      const candidate: Block = {
        hash: "",
        height: input.height,
        previousHash: input.previousHash,
        timestamp: input.timestamp,
        merkleRoot: input.merkleRoot,
        nonce,
        difficulty: this.difficulty,
        consensus: this.name,
        validatorAddress: input.minerAddress ?? null,
        metadata: {
          minedAt: now,
          algorithm: "sha256-leading-zeroes",
        },
        transactions: input.transactions,
        createdAt: now,
      };

      const hash = calculateBlockHash(candidate);
      if (hash.startsWith(prefix)) {
        return {
          block: {
            ...candidate,
            hash,
          },
          events: [
            {
              id: randomUUID(),
              blockHash: hash,
              height: input.height,
              algorithm: this.name,
              phase: "mined",
              validatorAddress: input.minerAddress ?? null,
              signature: null,
              payload: { nonce, difficulty: this.difficulty },
              createdAt: now,
            },
          ],
        };
      }

      nonce += 1;
    }
  }

  async validateBlock(block: Block): Promise<void> {
    if (block.consensus !== this.name) {
      throw new AppError(422, "CONSENSUS_MISMATCH", "Block was not created with Proof of Work");
    }

    if (!block.hash.startsWith("0".repeat(block.difficulty))) {
      throw new AppError(422, "INVALID_PROOF_OF_WORK", "Block hash does not satisfy difficulty");
    }
  }
}

