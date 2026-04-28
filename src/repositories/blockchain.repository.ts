import type {
  Block,
  BlockRecord,
  ConsensusEvent,
  NetworkNode,
  Transaction,
  TransactionStatus,
  ValidatorNode,
  Wallet,
} from "../models/blockchain.types";

export interface BalanceSnapshot {
  confirmed: number;
  pendingOutgoing: number;
  available: number;
}

export interface BlockchainRepository {
  createWallet(wallet: Wallet): Promise<Wallet>;
  getWallet(address: string): Promise<Wallet | null>;

  createTransaction(transaction: Transaction): Promise<Transaction>;
  getTransactionByHash(hash: string): Promise<Transaction | null>;
  getPendingTransactions(limit: number): Promise<Transaction[]>;
  updateTransactionsStatus(
    hashes: string[],
    status: TransactionStatus,
    blockHash?: string | null,
    rejectionReason?: string | null
  ): Promise<void>;
  getTransactionsByBlockHash(blockHash: string): Promise<Transaction[]>;
  getBalance(address: string): Promise<BalanceSnapshot>;

  createBlock(block: Block, consensusEvents?: ConsensusEvent[]): Promise<Block>;
  getLatestBlock(): Promise<Block | null>;
  getBlockByHash(hash: string): Promise<Block | null>;
  getBlockByHeight(height: number): Promise<Block | null>;
  listBlocks(): Promise<Block[]>;
  getBlockCount(): Promise<number>;

  upsertValidator(validator: ValidatorNode): Promise<ValidatorNode>;
  getValidator(address: string): Promise<ValidatorNode | null>;
  listActiveValidators(): Promise<ValidatorNode[]>;

  registerNode(node: NetworkNode): Promise<NetworkNode>;
  listNodes(): Promise<NetworkNode[]>;

  recordConsensusEvents(events: ConsensusEvent[]): Promise<void>;
  getConsensusEvents(blockHash: string): Promise<ConsensusEvent[]>;
}

export function blockRecordFromBlock(block: Block): BlockRecord {
  return {
    hash: block.hash,
    height: block.height,
    previousHash: block.previousHash,
    timestamp: block.timestamp,
    merkleRoot: block.merkleRoot,
    nonce: block.nonce,
    difficulty: block.difficulty,
    consensus: block.consensus,
    validatorAddress: block.validatorAddress ?? null,
    metadata: block.metadata,
    createdAt: block.createdAt,
  };
}

