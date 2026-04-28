import type {
  Block,
  ConsensusEvent,
  NetworkNode,
  Transaction,
  TransactionStatus,
  ValidatorNode,
  Wallet,
} from "../models/blockchain.types";
import type { BalanceSnapshot, BlockchainRepository } from "./blockchain.repository";

export class InMemoryBlockchainRepository implements BlockchainRepository {
  private readonly wallets = new Map<string, Wallet>();
  private readonly transactions = new Map<string, Transaction>();
  private readonly blocks = new Map<string, Block>();
  private readonly validators = new Map<string, ValidatorNode>();
  private readonly nodes = new Map<string, NetworkNode>();
  private readonly consensusEvents = new Map<string, ConsensusEvent>();

  async createWallet(wallet: Wallet): Promise<Wallet> {
    if (!this.wallets.has(wallet.address)) {
      this.wallets.set(wallet.address, wallet);
    }
    return this.wallets.get(wallet.address) ?? wallet;
  }

  async getWallet(address: string): Promise<Wallet | null> {
    return this.wallets.get(address) ?? null;
  }

  async createTransaction(transaction: Transaction): Promise<Transaction> {
    const existing = this.transactions.get(transaction.hash);
    const stored = existing ? { ...existing, ...transaction } : transaction;
    this.transactions.set(transaction.hash, stored);
    return stored;
  }

  async getTransactionByHash(hash: string): Promise<Transaction | null> {
    return this.transactions.get(hash) ?? null;
  }

  async getPendingTransactions(limit: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((transaction) => transaction.status === "PENDING")
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .slice(0, limit);
  }

  async updateTransactionsStatus(
    hashes: string[],
    status: TransactionStatus,
    blockHash: string | null = null,
    rejectionReason: string | null = null
  ): Promise<void> {
    for (const hash of hashes) {
      const transaction = this.transactions.get(hash);
      if (!transaction) {
        continue;
      }

      this.transactions.set(hash, {
        ...transaction,
        status,
        blockHash,
        rejectionReason,
        confirmedAt: status === "CONFIRMED" ? new Date().toISOString() : transaction.confirmedAt,
      });
    }
  }

  async getTransactionsByBlockHash(blockHash: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((transaction) => transaction.blockHash === blockHash)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async getBalance(address: string): Promise<BalanceSnapshot> {
    const transactions = Array.from(this.transactions.values());
    const confirmedIncoming = transactions
      .filter((transaction) => transaction.toAddress === address && transaction.status === "CONFIRMED")
      .reduce((total, transaction) => total + transaction.amount, 0);
    const confirmedOutgoing = transactions
      .filter((transaction) => transaction.fromAddress === address && transaction.status === "CONFIRMED")
      .reduce((total, transaction) => total + transaction.amount, 0);
    const pendingOutgoing = transactions
      .filter((transaction) => transaction.fromAddress === address && transaction.status === "PENDING")
      .reduce((total, transaction) => total + transaction.amount, 0);

    const confirmed = confirmedIncoming - confirmedOutgoing;

    return {
      confirmed,
      pendingOutgoing,
      available: confirmed - pendingOutgoing,
    };
  }

  async createBlock(block: Block, consensusEvents: ConsensusEvent[] = []): Promise<Block> {
    const confirmedAt = new Date().toISOString();
    const confirmedTransactions = block.transactions.map((transaction) => ({
      ...transaction,
      status: "CONFIRMED" as const,
      blockHash: block.hash,
      confirmedAt,
    }));
    const storedBlock = {
      ...block,
      transactions: confirmedTransactions,
    };

    this.blocks.set(block.hash, storedBlock);

    for (const transaction of confirmedTransactions) {
      this.transactions.set(transaction.hash, transaction);
    }

    for (const event of consensusEvents) {
      this.consensusEvents.set(event.id, event);
    }

    return storedBlock;
  }

  async getLatestBlock(): Promise<Block | null> {
    return (
      Array.from(this.blocks.values()).sort((left, right) => right.height - left.height)[0] ?? null
    );
  }

  async getBlockByHash(hash: string): Promise<Block | null> {
    const block = this.blocks.get(hash);
    if (!block) {
      return null;
    }

    return {
      ...block,
      transactions: await this.getTransactionsByBlockHash(hash),
    };
  }

  async getBlockByHeight(height: number): Promise<Block | null> {
    const block = Array.from(this.blocks.values()).find((item) => item.height === height);
    if (!block) {
      return null;
    }

    return {
      ...block,
      transactions: await this.getTransactionsByBlockHash(block.hash),
    };
  }

  async listBlocks(): Promise<Block[]> {
    return Array.from(this.blocks.values())
      .sort((left, right) => left.height - right.height)
      .map((block) => ({
        ...block,
        transactions: Array.from(this.transactions.values()).filter(
          (transaction) => transaction.blockHash === block.hash
        ),
      }));
  }

  async getBlockCount(): Promise<number> {
    return this.blocks.size;
  }

  async upsertValidator(validator: ValidatorNode): Promise<ValidatorNode> {
    this.validators.set(validator.address, validator);
    return validator;
  }

  async getValidator(address: string): Promise<ValidatorNode | null> {
    return this.validators.get(address) ?? null;
  }

  async listActiveValidators(): Promise<ValidatorNode[]> {
    return Array.from(this.validators.values()).filter(
      (validator) => validator.status === "ACTIVE"
    );
  }

  async registerNode(node: NetworkNode): Promise<NetworkNode> {
    const existing = Array.from(this.nodes.values()).find((item) => item.url === node.url);
    if (existing) {
      this.nodes.set(existing.id, { ...existing, ...node, id: existing.id });
      return this.nodes.get(existing.id) as NetworkNode;
    }

    this.nodes.set(node.id, node);
    return node;
  }

  async listNodes(): Promise<NetworkNode[]> {
    return Array.from(this.nodes.values()).sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt)
    );
  }

  async recordConsensusEvents(events: ConsensusEvent[]): Promise<void> {
    for (const event of events) {
      this.consensusEvents.set(event.id, event);
    }
  }

  async getConsensusEvents(blockHash: string): Promise<ConsensusEvent[]> {
    return Array.from(this.consensusEvents.values()).filter(
      (event) => event.blockHash === blockHash
    );
  }
}
