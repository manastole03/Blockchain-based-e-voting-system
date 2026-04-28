import type { Block, BlockRecord } from "../models/blockchain.types";
import { createHashFromObject } from "./hash";

export type BlockHashInput = Omit<BlockRecord, "hash" | "createdAt">;

export function blockHashInput(block: Block | BlockRecord | BlockHashInput): BlockHashInput {
  return {
    height: block.height,
    previousHash: block.previousHash,
    timestamp: block.timestamp,
    merkleRoot: block.merkleRoot,
    nonce: block.nonce,
    difficulty: block.difficulty,
    consensus: block.consensus,
    validatorAddress: block.validatorAddress ?? null,
    metadata: block.metadata ?? {},
  };
}

export function calculateBlockHash(block: Block | BlockRecord | BlockHashInput): string {
  return createHashFromObject(blockHashInput(block));
}

