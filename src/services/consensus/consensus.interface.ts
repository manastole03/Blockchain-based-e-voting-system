import type { BlockchainRepository } from "../../repositories/blockchain.repository";
import type { Block, ConsensusEvent, ConsensusName, Transaction } from "../../models/blockchain.types";

export interface BuildBlockInput {
  height: number;
  previousHash: string;
  transactions: Transaction[];
  merkleRoot: string;
  minerAddress?: string;
  timestamp: string;
}

export interface BuiltBlock {
  block: Block;
  events: ConsensusEvent[];
}

export interface ConsensusEngine {
  readonly name: ConsensusName;
  buildBlock(input: BuildBlockInput, repository: BlockchainRepository): Promise<BuiltBlock>;
  validateBlock(block: Block, repository: BlockchainRepository): Promise<void>;
}

