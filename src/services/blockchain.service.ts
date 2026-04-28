import type { EnvConfig } from "../config/env";
import { env } from "../config/env";
import type {
  Block,
  ChainValidationResult,
  ConsensusName,
  Transaction,
} from "../models/blockchain.types";
import type { BlockchainRepository } from "../repositories/blockchain.repository";
import { AppError } from "../utils/app-error";
import { calculateBlockHash } from "../utils/block-hash";
import { hashTransactionPayload } from "../utils/crypto";
import { calculateMerkleRoot } from "../utils/merkle";
import { createConsensusEngine } from "./consensus/factory";
import type { ConsensusEngine } from "./consensus/consensus.interface";
import { TransactionService } from "./transaction.service";

const ZERO_HASH = "0".repeat(64);

export class BlockchainService {
  private readonly consensusEngine: ConsensusEngine;

  constructor(
    private readonly repository: BlockchainRepository,
    private readonly transactionService: TransactionService,
    private readonly config: EnvConfig = env
  ) {
    this.consensusEngine = createConsensusEngine(config.CONSENSUS_ALGORITHM);
  }

  getConsensusInfo() {
    return {
      activeConsensus: this.config.CONSENSUS_ALGORITHM,
      supportedConsensus: ["pow", "pos", "pbft"] as ConsensusName[],
      proofOfWorkDifficulty: this.config.POW_DIFFICULTY,
      miningReward: this.config.MINING_REWARD,
      maxTransactionsPerBlock: this.config.MAX_TRANSACTIONS_PER_BLOCK,
    };
  }

  async initialize(): Promise<Block> {
    const latest = await this.repository.getLatestBlock();

    if (latest) {
      return latest;
    }

    const timestamp = new Date().toISOString();
    const genesis: Block = {
      hash: "",
      height: 0,
      previousHash: ZERO_HASH,
      timestamp,
      merkleRoot: calculateMerkleRoot([]),
      nonce: 0,
      difficulty: 0,
      consensus: this.config.CONSENSUS_ALGORITHM,
      validatorAddress: null,
      metadata: {
        genesis: true,
        createdBy: "backend",
      },
      transactions: [],
      createdAt: timestamp,
    };

    genesis.hash = calculateBlockHash(genesis);
    return this.repository.createBlock(genesis);
  }

  async mineBlock(minerAddress?: string): Promise<Block> {
    await this.initialize();

    if (minerAddress) {
      const minerWallet = await this.repository.getWallet(minerAddress);
      if (!minerWallet) {
        throw new AppError(404, "MINER_WALLET_NOT_FOUND", "Miner wallet was not found");
      }
    }

    const latestBlock = await this.repository.getLatestBlock();
    if (!latestBlock) {
      throw new AppError(500, "CHAIN_NOT_INITIALIZED", "Blockchain was not initialized");
    }

    const pending = await this.repository.getPendingTransactions(
      this.config.MAX_TRANSACTIONS_PER_BLOCK
    );
    const validTransactions = await this.validPendingTransactions(pending);
    const rewardTransaction =
      minerAddress && this.config.MINING_REWARD > 0
        ? this.transactionService.createRewardTransaction(minerAddress, this.config.MINING_REWARD)
        : null;
    const transactions = rewardTransaction
      ? [...validTransactions, rewardTransaction]
      : validTransactions;

    if (transactions.length === 0) {
      throw new AppError(409, "NO_TRANSACTIONS_TO_MINE", "There are no valid pending transactions");
    }

    const merkleRoot = calculateMerkleRoot(transactions.map((transaction) => transaction.hash));
    const built = await this.consensusEngine.buildBlock(
      {
        height: latestBlock.height + 1,
        previousHash: latestBlock.hash,
        transactions,
        merkleRoot,
        minerAddress,
        timestamp: new Date().toISOString(),
      },
      this.repository
    );

    const created = await this.repository.createBlock(built.block, built.events);
    return created;
  }

  async listChain(): Promise<Block[]> {
    await this.initialize();
    return this.repository.listBlocks();
  }

  async getBlock(identifier: string): Promise<Block> {
    await this.initialize();
    const isHeight = /^\d+$/.test(identifier) && identifier.length < 12;
    const block = isHeight
      ? await this.repository.getBlockByHeight(Number(identifier))
      : await this.repository.getBlockByHash(identifier);

    if (!block) {
      throw new AppError(404, "BLOCK_NOT_FOUND", "Block was not found");
    }

    return block;
  }

  async validateChain(): Promise<ChainValidationResult> {
    const blocks = await this.listChain();
    const errors: string[] = [];

    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      const recalculatedHash = calculateBlockHash(block);

      if (block.hash !== recalculatedHash) {
        errors.push(`Block ${block.height} hash is invalid`);
      }

      const expectedMerkleRoot = calculateMerkleRoot(
        block.transactions.map((transaction) => transaction.hash)
      );
      if (block.merkleRoot !== expectedMerkleRoot) {
        errors.push(`Block ${block.height} merkle root is invalid`);
      }

      for (const transaction of block.transactions) {
        const validation = await this.transactionService.validate(transaction, {
          checkBalance: false,
        });

        if (!validation.valid) {
          errors.push(`Transaction ${transaction.hash} is invalid: ${validation.errors.join(", ")}`);
        }

        const expectedHash = hashTransactionPayload({
          type: transaction.type,
          fromAddress: transaction.fromAddress,
          toAddress: transaction.toAddress,
          amount: transaction.amount,
          payload: transaction.payload,
          nonce: transaction.nonce,
          timestamp: transaction.timestamp,
        });

        if (expectedHash !== transaction.hash) {
          errors.push(`Transaction ${transaction.hash} payload hash is invalid`);
        }
      }

      if (index === 0) {
        if (block.height !== 0 || block.previousHash !== ZERO_HASH) {
          errors.push("Genesis block is malformed");
        }
        continue;
      }

      const previous = blocks[index - 1];
      if (block.height !== previous.height + 1) {
        errors.push(`Block ${block.height} height does not follow previous block`);
      }

      if (block.previousHash !== previous.hash) {
        errors.push(`Block ${block.height} previous hash does not match block ${previous.height}`);
      }

      try {
        await createConsensusEngine(block.consensus).validateBlock(block, this.repository);
      } catch (error) {
        errors.push(
          error instanceof Error
            ? `Block ${block.height} consensus invalid: ${error.message}`
            : `Block ${block.height} consensus invalid`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async validPendingTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    const validTransactions: Transaction[] = [];

    for (const transaction of transactions) {
      const validation = await this.transactionService.validate(transaction, {
        checkBalance: false,
      });

      if (validation.valid) {
        validTransactions.push(transaction);
      } else {
        await this.repository.updateTransactionsStatus(
          [transaction.hash],
          "REJECTED",
          null,
          validation.errors.join("; ")
        );
      }
    }

    return validTransactions;
  }
}
