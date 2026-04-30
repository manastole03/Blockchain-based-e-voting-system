import type { Pool, PoolClient } from "pg";
import type {
  Block,
  ConsensusEvent,
  ConsensusName,
  NetworkNode,
  Transaction,
  TransactionStatus,
  TransactionType,
  ValidatorNode,
  Wallet,
} from "../models/blockchain.types";
import type { BalanceSnapshot, BlockchainRepository } from "./blockchain.repository";

type Queryable = Pool | PoolClient;

export class PostgresBlockchainRepository implements BlockchainRepository {
  constructor(private readonly pool: Pool) {}

  async createWallet(wallet: Wallet): Promise<Wallet> {
    const result = await this.pool.query(
      `INSERT INTO wallets (address, public_key, label, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (address) DO NOTHING
       RETURNING *`,
      [wallet.address, wallet.publicKey, wallet.label ?? null, wallet.createdAt]
    );

    return result.rows[0] ? mapWallet(result.rows[0]) : wallet;
  }

  async getWallet(address: string): Promise<Wallet | null> {
    const result = await this.pool.query("SELECT * FROM wallets WHERE address = $1", [address]);
    return result.rows[0] ? mapWallet(result.rows[0]) : null;
  }

  async createTransaction(transaction: Transaction): Promise<Transaction> {
    const result = await insertTransaction(this.pool, transaction);
    return mapTransaction(result.rows[0]);
  }

  async getTransactionByHash(hash: string): Promise<Transaction | null> {
    const result = await this.pool.query("SELECT * FROM transactions WHERE hash = $1", [hash]);
    return result.rows[0] ? mapTransaction(result.rows[0]) : null;
  }

  async getPendingTransactions(limit: number): Promise<Transaction[]> {
    const result = await this.pool.query(
      `SELECT * FROM transactions
       WHERE status = 'PENDING'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(mapTransaction);
  }

  async updateTransactionsStatus(
    hashes: string[],
    status: TransactionStatus,
    blockHash: string | null = null,
    rejectionReason: string | null = null
  ): Promise<void> {
    if (hashes.length === 0) {
      return;
    }

    await this.pool.query(
      `UPDATE transactions
       SET status = $2,
           block_hash = $3,
           rejection_reason = $4,
           confirmed_at = CASE WHEN $2 = 'CONFIRMED' THEN NOW() ELSE confirmed_at END
       WHERE hash = ANY($1::text[])`,
      [hashes, status, blockHash, rejectionReason]
    );
  }

  async getTransactionsByBlockHash(blockHash: string): Promise<Transaction[]> {
    const result = await this.pool.query(
      "SELECT * FROM transactions WHERE block_hash = $1 ORDER BY created_at ASC",
      [blockHash]
    );
    return result.rows.map(mapTransaction);
  }

  async getBalance(address: string): Promise<BalanceSnapshot> {
    const incoming = await this.pool.query(
      `SELECT COALESCE(SUM(amount), 0)::float AS total
       FROM transactions
       WHERE to_address = $1 AND status = 'CONFIRMED'`,
      [address]
    );
    const outgoing = await this.pool.query(
      `SELECT COALESCE(SUM(amount), 0)::float AS total
       FROM transactions
       WHERE from_address = $1 AND status = 'CONFIRMED'`,
      [address]
    );
    const pendingOutgoing = await this.pool.query(
      `SELECT COALESCE(SUM(amount), 0)::float AS total
       FROM transactions
       WHERE from_address = $1 AND status = 'PENDING'`,
      [address]
    );

    const confirmed = Number(incoming.rows[0].total) - Number(outgoing.rows[0].total);
    const pending = Number(pendingOutgoing.rows[0].total);

    return {
      confirmed,
      pendingOutgoing: pending,
      available: confirmed - pending,
    };
  }

  async createBlock(block: Block, consensusEvents: ConsensusEvent[] = []): Promise<Block> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO blocks
          (hash, height, previous_hash, timestamp, merkle_root, nonce, difficulty,
           consensus, validator_address, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          block.hash,
          block.height,
          block.previousHash,
          block.timestamp,
          block.merkleRoot,
          block.nonce,
          block.difficulty,
          block.consensus,
          block.validatorAddress ?? null,
          JSON.stringify(block.metadata ?? {}),
          block.createdAt,
        ]
      );

      for (const transaction of block.transactions) {
        await insertTransaction(client, transaction);
      }

      const hashes = block.transactions.map((transaction) => transaction.hash);
      await client.query(
        `UPDATE transactions
         SET status = 'CONFIRMED',
             block_hash = $2,
             confirmed_at = NOW()
         WHERE hash = ANY($1::text[])`,
        [hashes, block.hash]
      );

      await insertConsensusEvents(client, consensusEvents);

      await client.query("COMMIT");
      const confirmedAt = new Date().toISOString();
      return {
        ...block,
        transactions: block.transactions.map((transaction) => ({
          ...transaction,
          status: "CONFIRMED" as const,
          blockHash: block.hash,
          confirmedAt,
        })),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getLatestBlock(): Promise<Block | null> {
    const result = await this.pool.query("SELECT * FROM blocks ORDER BY height DESC LIMIT 1");
    return result.rows[0] ? this.hydrateBlock(result.rows[0]) : null;
  }

  async getBlockByHash(hash: string): Promise<Block | null> {
    const result = await this.pool.query("SELECT * FROM blocks WHERE hash = $1", [hash]);
    return result.rows[0] ? this.hydrateBlock(result.rows[0]) : null;
  }

  async getBlockByHeight(height: number): Promise<Block | null> {
    const result = await this.pool.query("SELECT * FROM blocks WHERE height = $1", [height]);
    return result.rows[0] ? this.hydrateBlock(result.rows[0]) : null;
  }

  async listBlocks(): Promise<Block[]> {
    const result = await this.pool.query("SELECT * FROM blocks ORDER BY height ASC");
    return Promise.all(result.rows.map((row) => this.hydrateBlock(row)));
  }

  async getBlockCount(): Promise<number> {
    const result = await this.pool.query("SELECT COUNT(*)::int AS count FROM blocks");
    return Number(result.rows[0].count);
  }

  async upsertValidator(validator: ValidatorNode): Promise<ValidatorNode> {
    const result = await this.pool.query(
      `INSERT INTO validators
        (address, public_key, stake, status, node_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (address) DO UPDATE SET
         public_key = EXCLUDED.public_key,
         stake = EXCLUDED.stake,
         status = EXCLUDED.status,
         node_url = EXCLUDED.node_url,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [
        validator.address,
        validator.publicKey,
        validator.stake,
        validator.status,
        validator.nodeUrl ?? null,
        validator.createdAt,
        validator.updatedAt,
      ]
    );

    return mapValidator(result.rows[0]);
  }

  async getValidator(address: string): Promise<ValidatorNode | null> {
    const result = await this.pool.query("SELECT * FROM validators WHERE address = $1", [address]);
    return result.rows[0] ? mapValidator(result.rows[0]) : null;
  }

  async listActiveValidators(): Promise<ValidatorNode[]> {
    const result = await this.pool.query(
      "SELECT * FROM validators WHERE status = 'ACTIVE' ORDER BY address ASC"
    );
    return result.rows.map(mapValidator);
  }

  async registerNode(node: NetworkNode): Promise<NetworkNode> {
    const result = await this.pool.query(
      `INSERT INTO network_nodes (id, url, public_key, status, metadata, last_seen_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (url) DO UPDATE SET
         public_key = EXCLUDED.public_key,
         status = EXCLUDED.status,
         metadata = EXCLUDED.metadata,
         last_seen_at = EXCLUDED.last_seen_at
       RETURNING *`,
      [
        node.id,
        node.url,
        node.publicKey ?? null,
        node.status,
        JSON.stringify(node.metadata ?? {}),
        node.lastSeenAt,
        node.createdAt,
      ]
    );

    return mapNode(result.rows[0]);
  }

  async listNodes(): Promise<NetworkNode[]> {
    const result = await this.pool.query("SELECT * FROM network_nodes ORDER BY created_at ASC");
    return result.rows.map(mapNode);
  }

  async recordConsensusEvents(events: ConsensusEvent[]): Promise<void> {
    await insertConsensusEvents(this.pool, events);
  }

  async getConsensusEvents(blockHash: string): Promise<ConsensusEvent[]> {
    const result = await this.pool.query(
      "SELECT * FROM consensus_events WHERE block_hash = $1 ORDER BY created_at ASC",
      [blockHash]
    );
    return result.rows.map(mapConsensusEvent);
  }

  private async hydrateBlock(row: Record<string, unknown>): Promise<Block> {
    const block = mapBlock(row);
    return {
      ...block,
      transactions: await this.getTransactionsByBlockHash(block.hash),
    };
  }
}

function insertTransaction(queryable: Queryable, transaction: Transaction) {
  return queryable.query(
    `INSERT INTO transactions
      (id, hash, type, from_address, to_address, amount, payload, signature, public_key,
       nonce, status, block_hash, rejection_reason, created_at, confirmed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     ON CONFLICT (hash) DO UPDATE SET
       status = EXCLUDED.status,
       block_hash = COALESCE(EXCLUDED.block_hash, transactions.block_hash),
       rejection_reason = EXCLUDED.rejection_reason,
       confirmed_at = COALESCE(EXCLUDED.confirmed_at, transactions.confirmed_at)
     RETURNING *`,
    [
      transaction.id,
      transaction.hash,
      transaction.type,
      transaction.fromAddress,
      transaction.toAddress,
      transaction.amount,
      JSON.stringify(transaction.payload ?? {}),
      transaction.signature,
      transaction.publicKey,
      transaction.nonce,
      transaction.status,
      transaction.blockHash ?? null,
      transaction.rejectionReason ?? null,
      transaction.createdAt,
      transaction.confirmedAt ?? null,
    ]
  );
}

async function insertConsensusEvents(queryable: Queryable, events: ConsensusEvent[]): Promise<void> {
  for (const event of events) {
    await queryable.query(
      `INSERT INTO consensus_events
        (id, block_hash, height, algorithm, phase, validator_address, signature, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        event.id,
        event.blockHash,
        event.height,
        event.algorithm,
        event.phase,
        event.validatorAddress ?? null,
        event.signature ?? null,
        JSON.stringify(event.payload ?? {}),
        event.createdAt,
      ]
    );
  }
}

function mapWallet(row: Record<string, unknown>): Wallet {
  return {
    address: String(row.address),
    publicKey: String(row.public_key),
    label: (row.label as string | null) ?? null,
    createdAt: toIso(row.created_at),
  };
}

function mapTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id),
    hash: String(row.hash),
    type: row.type as TransactionType,
    fromAddress: (row.from_address as string | null) ?? null,
    toAddress: (row.to_address as string | null) ?? null,
    amount: Number(row.amount),
    payload: parseJson(row.payload),
    signature: (row.signature as string | null) ?? null,
    publicKey: (row.public_key as string | null) ?? null,
    nonce: Number(row.nonce),
    status: row.status as TransactionStatus,
    blockHash: (row.block_hash as string | null) ?? null,
    rejectionReason: (row.rejection_reason as string | null) ?? null,
    createdAt: toIso(row.created_at),
    confirmedAt: row.confirmed_at ? toIso(row.confirmed_at) : null,
    timestamp: toIso(row.created_at),
  };
}

function mapBlock(row: Record<string, unknown>): Block {
  return {
    hash: String(row.hash),
    height: Number(row.height),
    previousHash: String(row.previous_hash),
    timestamp: toIso(row.timestamp),
    merkleRoot: String(row.merkle_root),
    nonce: Number(row.nonce),
    difficulty: Number(row.difficulty),
    consensus: row.consensus as ConsensusName,
    validatorAddress: (row.validator_address as string | null) ?? null,
    metadata: parseJson(row.metadata),
    transactions: [],
    createdAt: toIso(row.created_at),
  };
}

function mapValidator(row: Record<string, unknown>): ValidatorNode {
  return {
    address: String(row.address),
    publicKey: String(row.public_key),
    stake: Number(row.stake),
    status: row.status as ValidatorNode["status"],
    nodeUrl: (row.node_url as string | null) ?? null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapNode(row: Record<string, unknown>): NetworkNode {
  return {
    id: String(row.id),
    url: String(row.url),
    publicKey: (row.public_key as string | null) ?? null,
    status: row.status as NetworkNode["status"],
    metadata: parseJson(row.metadata),
    lastSeenAt: toIso(row.last_seen_at),
    createdAt: toIso(row.created_at),
  };
}

function mapConsensusEvent(row: Record<string, unknown>): ConsensusEvent {
  return {
    id: String(row.id),
    blockHash: String(row.block_hash),
    height: Number(row.height),
    algorithm: row.algorithm as ConsensusName,
    phase: String(row.phase),
    validatorAddress: (row.validator_address as string | null) ?? null,
    signature: (row.signature as string | null) ?? null,
    payload: parseJson(row.payload),
    createdAt: toIso(row.created_at),
  };
}

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function parseJson(value: unknown): Record<string, unknown> {
  if (!value) {
    return {};
  }

  if (typeof value === "string") {
    return JSON.parse(value);
  }

  return value as Record<string, unknown>;
}
