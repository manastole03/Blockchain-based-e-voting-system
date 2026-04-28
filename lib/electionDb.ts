import crypto from "crypto";
import { Pool, type PoolClient } from "pg";
import { db, type Candidate, type Election, type Vote, type Voter, type Wallet } from "./db";

type VoterElectionRow = {
  voter_id: string;
  status: "incomplete" | "complete";
  election_id: string | null;
  name: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  election_status: "upcoming" | "active" | "closed" | null;
  image: string | null;
  total_voters: number | null;
  category: string | null;
};

type CandidateWalletRow = {
  id: string;
  name: string;
  party: string;
  election_id: string;
  tokens: string | number;
};

type VoteDetailsRow = {
  transaction_key: string;
  transaction_hash: string | null;
  block_hash: string | null;
  block_height: number | null;
  previous_hash: string | null;
  merkle_root: string | null;
  nonce: string | number | null;
  difficulty: number | null;
  consensus: string | null;
  validator_node: string | null;
  signature: string;
  commitment: string;
  created_at: string;
  election_name: string | null;
  candidate_name: string | null;
};

type CastVoteResult = {
  transactionKey: string;
  signature: string;
  transactionHash: string;
  blockHash: string;
  blockHeight: number;
};

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var electionPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var electionSchemaReady: Promise<void> | undefined;
}

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://evoting:evoting_password@localhost:5432/evoting";
const voteLedgerDifficulty = Math.min(
  Math.max(Number(process.env.APP_VOTE_POW_DIFFICULTY ?? 2), 0),
  5
);
const zeroHash = "0".repeat(64);

const pool =
  global.electionPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  global.electionPool = pool;
}

async function query(text: string, params: unknown[] = []) {
  await ensureElectionSchema();
  return pool.query(text, params);
}

async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureElectionSchema();
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

function mapElection(row: VoterElectionRow | any): Election {
  return {
    _id: row.election_id ?? row.id,
    name: row.name,
    description: row.description,
    date: formatDate(row.start_date),
    endDate: formatDate(row.end_date),
    status: row.election_status ?? row.status,
    image: row.image ?? "",
    totalVoters: Number(row.total_voters ?? 0),
    category: row.category,
  };
}

function formatDate(value: string | Date | null): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function sha256(value: unknown): string {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function voterCommitment(voterId: string, electionId: string, transactionKey: string): string {
  return crypto
    .createHash("sha256")
    .update(`${voterId}:${electionId}:${transactionKey}`)
    .digest("hex");
}

function buildVoteTransactionHash(input: {
  voterId: string;
  electionId: string;
  candidateId: string;
  transactionKey: string;
  signature: string;
  commitment: string;
  timestamp: string;
}): string {
  return sha256({
    type: "VOTE",
    version: 1,
    electionId: input.electionId,
    candidateId: input.candidateId,
    transactionKey: input.transactionKey,
    voterCommitment: voterCommitment(input.voterId, input.electionId, input.transactionKey),
    signature: input.signature,
    commitment: input.commitment,
    timestamp: input.timestamp,
  });
}

function hashVoteBlock(input: {
  height: number;
  previousHash: string;
  transactionHash: string;
  merkleRoot: string;
  nonce: number;
  difficulty: number;
  consensus: "pow";
  timestamp: string;
}): string {
  return sha256(input);
}

function mineVoteBlock(input: {
  height: number;
  previousHash: string;
  transactionHash: string;
  timestamp: string;
  difficulty: number;
}) {
  const merkleRoot = input.transactionHash;
  const prefix = "0".repeat(input.difficulty);
  let nonce = 0;
  let hash = "";

  do {
    hash = hashVoteBlock({
      height: input.height,
      previousHash: input.previousHash,
      transactionHash: input.transactionHash,
      merkleRoot,
      nonce,
      difficulty: input.difficulty,
      consensus: "pow",
      timestamp: input.timestamp,
    });
    nonce += 1;
  } while (prefix && !hash.startsWith(prefix));

  return {
    hash,
    merkleRoot,
    nonce: nonce - 1,
    difficulty: input.difficulty,
    consensus: "pow" as const,
  };
}

async function seedInitialData(client: PoolClient): Promise<void> {
  for (const voter of db.voters) {
    await client.query(
      `INSERT INTO app_voters (id, name, email, password, location_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [voter.id, voter.name, voter.email, voter.password, voter.locationId]
    );
  }

  for (const election of db.elections) {
    await client.query(
      `INSERT INTO app_elections
        (id, name, description, start_date, end_date, status, image, total_voters, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [
        election._id,
        election.name,
        election.description,
        election.date,
        election.endDate,
        election.status,
        election.image,
        election.totalVoters,
        election.category,
      ]
    );
  }

  for (const candidate of db.candidates) {
    await client.query(
      `INSERT INTO app_candidates
        (id, name, party, image, active, election_id, manifesto, vote_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        candidate.id,
        candidate.name,
        candidate.party,
        candidate.image,
        candidate.active,
        candidate.electionId,
        candidate.manifesto,
        candidate.voteCount,
      ]
    );
  }

  for (const wallet of db.wallets) {
    await client.query(
      `INSERT INTO app_wallets (voter_id, public_key, tokens)
       VALUES ($1, $2, $3)
       ON CONFLICT (voter_id) DO NOTHING`,
      [wallet.voterId, wallet.publicKey, wallet.tokens]
    );
  }

  for (const voterElection of db.voterElections) {
    await client.query(
      `INSERT INTO app_voter_elections (voter_id, election_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (voter_id, election_id) DO NOTHING`,
      [voterElection.voterId, voterElection.electionId, voterElection.status]
    );
  }
}

async function backfillVoteLedger(client: PoolClient): Promise<void> {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('app_vote_blocks'))");

  const votes = await client.query(
    `SELECT id, voter_id, election_id, candidate_id, transaction_key, transaction_hash, signature, commitment, created_at
     FROM app_votes
     WHERE block_hash IS NULL
     ORDER BY created_at ASC, id ASC`
  );

  for (const vote of votes.rows) {
    const timestamp = new Date(vote.created_at).toISOString();
    const transactionHash =
      vote.transaction_hash ??
      buildVoteTransactionHash({
        voterId: vote.voter_id,
        electionId: vote.election_id,
        candidateId: vote.candidate_id,
        transactionKey: vote.transaction_key,
        signature: vote.signature,
        commitment: vote.commitment,
        timestamp,
      });

    const latestBlockResult = await client.query(
      `SELECT hash, height
       FROM app_vote_blocks
       ORDER BY height DESC
       LIMIT 1`
    );
    const latestBlock = latestBlockResult.rows[0];
    const height = latestBlock ? Number(latestBlock.height) + 1 : 1;
    const previousHash = latestBlock?.hash ?? zeroHash;
    const block = mineVoteBlock({
      height,
      previousHash,
      transactionHash,
      timestamp,
      difficulty: voteLedgerDifficulty,
    });

    await client.query(
      `UPDATE app_votes
       SET transaction_hash = $1
       WHERE id = $2`,
      [transactionHash, vote.id]
    );

    await client.query(
      `INSERT INTO app_vote_blocks
        (hash, height, previous_hash, vote_id, transaction_hash, merkle_root, nonce, difficulty, consensus, validator_node, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pow', 'next-api-vote-ledger', $9, $10)
       ON CONFLICT (vote_id) DO NOTHING`,
      [
        block.hash,
        height,
        previousHash,
        vote.id,
        transactionHash,
        block.merkleRoot,
        block.nonce,
        block.difficulty,
        {
          type: "VOTE_BLOCK_BACKFILL",
          voteId: vote.id,
          electionId: vote.election_id,
          candidateId: vote.candidate_id,
          transactionKey: vote.transaction_key,
          transactionHash,
          voterCommitment: voterCommitment(vote.voter_id, vote.election_id, vote.transaction_key),
        },
        timestamp,
      ]
    );

    await client.query(
      `UPDATE app_votes
       SET block_hash = $1
       WHERE id = $2`,
      [block.hash, vote.id]
    );
  }
}

export async function ensureElectionSchema(): Promise<void> {
  if (!global.electionSchemaReady) {
    global.electionSchemaReady = (async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`
          CREATE TABLE IF NOT EXISTS app_voters (
            id VARCHAR(80) PRIMARY KEY,
            name VARCHAR(160) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password TEXT NOT NULL,
            location_id VARCHAR(120) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS app_elections (
            id VARCHAR(80) PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            status VARCHAR(20) NOT NULL,
            image TEXT NOT NULL DEFAULT '',
            total_voters INTEGER NOT NULL DEFAULT 0,
            category VARCHAR(120) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT app_elections_status_check CHECK (status IN ('upcoming', 'active', 'closed'))
          );

          CREATE TABLE IF NOT EXISTS app_candidates (
            id VARCHAR(80) PRIMARY KEY,
            name VARCHAR(160) NOT NULL,
            party VARCHAR(160) NOT NULL,
            image TEXT NOT NULL DEFAULT '',
            active BOOLEAN NOT NULL DEFAULT TRUE,
            election_id VARCHAR(80) NOT NULL REFERENCES app_elections(id) ON DELETE CASCADE,
            manifesto TEXT NOT NULL DEFAULT '',
            vote_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT app_candidates_vote_count_check CHECK (vote_count >= 0)
          );

          CREATE INDEX IF NOT EXISTS idx_app_candidates_election_active
            ON app_candidates (election_id, active);

          CREATE TABLE IF NOT EXISTS app_wallets (
            voter_id VARCHAR(80) PRIMARY KEY REFERENCES app_voters(id) ON DELETE CASCADE,
            public_key TEXT NOT NULL,
            tokens INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT app_wallets_tokens_check CHECK (tokens >= 0)
          );

          CREATE TABLE IF NOT EXISTS app_voter_elections (
            voter_id VARCHAR(80) NOT NULL REFERENCES app_voters(id) ON DELETE CASCADE,
            election_id VARCHAR(80) NOT NULL REFERENCES app_elections(id) ON DELETE CASCADE,
            status VARCHAR(20) NOT NULL DEFAULT 'incomplete',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (voter_id, election_id),
            CONSTRAINT app_voter_elections_status_check CHECK (status IN ('incomplete', 'complete'))
          );

          CREATE INDEX IF NOT EXISTS idx_app_voter_elections_voter
            ON app_voter_elections (voter_id);

          CREATE TABLE IF NOT EXISTS app_votes (
            id VARCHAR(80) PRIMARY KEY,
            voter_id VARCHAR(80) NOT NULL REFERENCES app_voters(id) ON DELETE CASCADE,
            election_id VARCHAR(80) NOT NULL REFERENCES app_elections(id) ON DELETE CASCADE,
            candidate_id VARCHAR(80) NOT NULL REFERENCES app_candidates(id) ON DELETE CASCADE,
            transaction_key VARCHAR(120) NOT NULL UNIQUE,
            transaction_hash CHAR(64) UNIQUE,
            block_hash CHAR(64),
            signature TEXT NOT NULL,
            commitment CHAR(64) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (voter_id, election_id)
          );

          ALTER TABLE app_votes
            ADD COLUMN IF NOT EXISTS transaction_hash CHAR(64) UNIQUE,
            ADD COLUMN IF NOT EXISTS block_hash CHAR(64);

          CREATE INDEX IF NOT EXISTS idx_app_votes_candidate
            ON app_votes (candidate_id);

          CREATE INDEX IF NOT EXISTS idx_app_votes_election
            ON app_votes (election_id);

          CREATE TABLE IF NOT EXISTS app_vote_blocks (
            hash CHAR(64) PRIMARY KEY,
            height INTEGER NOT NULL UNIQUE,
            previous_hash CHAR(64) NOT NULL,
            vote_id VARCHAR(80) NOT NULL UNIQUE REFERENCES app_votes(id) ON DELETE CASCADE,
            transaction_hash CHAR(64) NOT NULL UNIQUE,
            merkle_root CHAR(64) NOT NULL,
            nonce BIGINT NOT NULL,
            difficulty INTEGER NOT NULL,
            consensus VARCHAR(20) NOT NULL DEFAULT 'pow',
            validator_node VARCHAR(120) NOT NULL DEFAULT 'next-api-vote-ledger',
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT app_vote_blocks_consensus_check CHECK (consensus IN ('pow'))
          );

          CREATE INDEX IF NOT EXISTS idx_app_vote_blocks_height
            ON app_vote_blocks (height);

          CREATE INDEX IF NOT EXISTS idx_app_vote_blocks_vote_id
            ON app_vote_blocks (vote_id);
        `);
        await seedInitialData(client);
        await backfillVoteLedger(client);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        global.electionSchemaReady = undefined;
        throw error;
      } finally {
        client.release();
      }
    })();
  }

  return global.electionSchemaReady;
}

export const electionDb = {
  ApiError,

  async findVoterByCredentials(email: string, password: string): Promise<Voter | null> {
    const result = await query(
      `SELECT id, name, email, password, location_id
       FROM app_voters
       WHERE email = $1 AND password = $2`,
      [email, password]
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      locationId: row.location_id,
    };
  },

  async findVoterById(id: string): Promise<Voter | null> {
    const result = await query(
      `SELECT id, name, email, password, location_id
       FROM app_voters
       WHERE id = $1`,
      [id]
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      locationId: row.location_id,
    };
  },

  async getWalletByVoterId(voterId: string): Promise<Wallet | null> {
    const result = await query(
      `SELECT voter_id, public_key, tokens
       FROM app_wallets
       WHERE voter_id = $1`,
      [voterId]
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      voterId: row.voter_id,
      publicKey: row.public_key,
      tokens: Number(row.tokens),
    };
  },

  async getVoterElections(voterId: string) {
    const result = await query(
      `SELECT
         ve.voter_id,
         ve.status,
         e.id AS election_id,
         e.name,
         e.description,
         e.start_date,
         e.end_date,
         e.status AS election_status,
         e.image,
         e.total_voters,
         e.category
       FROM app_voter_elections ve
       JOIN app_elections e ON e.id = ve.election_id
       WHERE ve.voter_id = $1
       ORDER BY e.start_date ASC`,
      [voterId]
    );

    return result.rows.map((row: VoterElectionRow) => {
      const election = mapElection(row);
      return {
        voterId: row.voter_id,
        status: row.status,
        election,
        electionId: election,
      };
    });
  },

  async findElectionById(id: string): Promise<Election | null> {
    const result = await query(
      `SELECT
         id AS election_id,
         name,
         description,
         start_date,
         end_date,
         status AS election_status,
         image,
         total_voters,
         category
       FROM app_elections
       WHERE id = $1`,
      [id]
    );

    const row = result.rows[0];
    return row ? mapElection(row) : null;
  },

  async getActiveCandidatesByElection(electionId: string): Promise<Candidate[]> {
    const result = await query(
      `SELECT id, name, party, image, active, election_id, manifesto, vote_count
       FROM app_candidates
       WHERE election_id = $1 AND active = TRUE
       ORDER BY created_at ASC, id ASC`,
      [electionId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      _id: row.id,
      name: row.name,
      party: row.party,
      image: row.image,
      active: row.active,
      electionId: row.election_id,
      manifesto: row.manifesto,
      voteCount: Number(row.vote_count),
    }));
  },

  async castVote(params: {
    voterId: string;
    electionId: string;
    candidateId: string;
    transactionKey: string;
    signature: string;
    commitment: string;
  }): Promise<CastVoteResult> {
    return withClient(async (client) => {
      await client.query("BEGIN");

      try {
        const existingVote = await client.query(
          `SELECT id FROM app_votes WHERE voter_id = $1 AND election_id = $2`,
          [params.voterId, params.electionId]
        );

        if ((existingVote.rowCount ?? 0) > 0) {
          throw new ApiError(409, "You have already voted in this election.");
        }

        const walletResult = await client.query(
          `SELECT voter_id, tokens
           FROM app_wallets
           WHERE voter_id = $1
           FOR UPDATE`,
          [params.voterId]
        );

        const wallet = walletResult.rows[0];
        if (!wallet || Number(wallet.tokens) <= 0) {
          throw new ApiError(403, "No vote tokens available.");
        }

        const candidateResult = await client.query(
          `SELECT id
           FROM app_candidates
           WHERE id = $1 AND election_id = $2 AND active = TRUE
           FOR UPDATE`,
          [params.candidateId, params.electionId]
        );

        if ((candidateResult.rowCount ?? 0) === 0) {
          throw new ApiError(404, "Candidate not found or not active in this election.");
        }

        const voteId = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const transactionHash = buildVoteTransactionHash({
          voterId: params.voterId,
          electionId: params.electionId,
          candidateId: params.candidateId,
          transactionKey: params.transactionKey,
          signature: params.signature,
          commitment: params.commitment,
          timestamp: createdAt,
        });

        await client.query("SELECT pg_advisory_xact_lock(hashtext('app_vote_blocks'))");

        const latestBlockResult = await client.query(
          `SELECT hash, height
           FROM app_vote_blocks
           ORDER BY height DESC
           LIMIT 1`
        );
        const latestBlock = latestBlockResult.rows[0];
        const height = latestBlock ? Number(latestBlock.height) + 1 : 1;
        const previousHash = latestBlock?.hash ?? zeroHash;
        const block = mineVoteBlock({
          height,
          previousHash,
          transactionHash,
          timestamp: createdAt,
          difficulty: voteLedgerDifficulty,
        });

        await client.query(
          `INSERT INTO app_votes
            (id, voter_id, election_id, candidate_id, transaction_key, transaction_hash, signature, commitment, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            voteId,
            params.voterId,
            params.electionId,
            params.candidateId,
            params.transactionKey,
            transactionHash,
            params.signature,
            params.commitment,
            createdAt,
          ]
        );

        await client.query(
          `INSERT INTO app_vote_blocks
            (hash, height, previous_hash, vote_id, transaction_hash, merkle_root, nonce, difficulty, consensus, validator_node, payload, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pow', 'next-api-vote-ledger', $9, $10)`,
          [
            block.hash,
            height,
            previousHash,
            voteId,
            transactionHash,
            block.merkleRoot,
            block.nonce,
            block.difficulty,
            {
              type: "VOTE_BLOCK",
              voteId,
              electionId: params.electionId,
              candidateId: params.candidateId,
              transactionKey: params.transactionKey,
              transactionHash,
              voterCommitment: voterCommitment(params.voterId, params.electionId, params.transactionKey),
            },
            createdAt,
          ]
        );

        await client.query(
          `UPDATE app_votes
           SET block_hash = $1
           WHERE id = $2`,
          [block.hash, voteId]
        );

        await client.query(
          `UPDATE app_wallets
           SET tokens = tokens - 1, updated_at = NOW()
           WHERE voter_id = $1`,
          [params.voterId]
        );

        await client.query(
          `UPDATE app_candidates
           SET vote_count = vote_count + 1
           WHERE id = $1`,
          [params.candidateId]
        );

        await client.query(
          `UPDATE app_voter_elections
           SET status = 'complete', updated_at = NOW()
           WHERE voter_id = $1 AND election_id = $2`,
          [params.voterId, params.electionId]
        );

        await client.query("COMMIT");

        return {
          transactionKey: params.transactionKey,
          signature: params.signature,
          transactionHash,
          blockHash: block.hash,
          blockHeight: height,
        };
      } catch (error: any) {
        await client.query("ROLLBACK");
        if (error?.code === "23505") {
          throw new ApiError(409, "You have already voted in this election.");
        }
        throw error;
      }
    });
  },

  async getCandidateWallets() {
    const result = await query(
      `SELECT
         c.id,
         c.name,
         c.party,
         c.election_id,
         COUNT(v.id) AS tokens
       FROM app_candidates c
       LEFT JOIN app_votes v ON v.candidate_id = c.id
       GROUP BY c.id, c.name, c.party, c.election_id
       ORDER BY c.election_id ASC, tokens DESC, c.name ASC`
    );

    return result.rows.map((row: CandidateWalletRow) => ({
      name: row.name,
      party: row.party,
      public_key: `0x${row.id.replace(/-/g, "").slice(0, 40).toUpperCase()}`,
      tokens: Number(row.tokens),
      location: row.election_id,
    }));
  },

  async findVoteByTransactionKey(transactionKey: string): Promise<(Vote & {
    electionName?: string;
    candidateName?: string;
    transactionHash?: string | null;
    blockHash?: string | null;
    blockHeight?: number | null;
    previousHash?: string | null;
    merkleRoot?: string | null;
    nonce?: number | null;
    difficulty?: number | null;
    consensus?: string | null;
    validatorNode?: string | null;
  }) | null> {
    const result = await query(
      `SELECT
         v.transaction_key,
         v.transaction_hash,
         v.block_hash,
         v.signature,
         v.commitment,
         v.created_at,
         e.name AS election_name,
         c.name AS candidate_name,
         v.id,
         v.voter_id,
         v.election_id,
         v.candidate_id,
         b.height AS block_height,
         b.previous_hash,
         b.merkle_root,
         b.nonce,
         b.difficulty,
         b.consensus,
         b.validator_node
       FROM app_votes v
       JOIN app_elections e ON e.id = v.election_id
       JOIN app_candidates c ON c.id = v.candidate_id
       LEFT JOIN app_vote_blocks b ON b.hash = v.block_hash
       WHERE v.transaction_key = $1`,
      [transactionKey]
    );

    const row = result.rows[0] as VoteDetailsRow & any;
    if (!row) return null;

    return {
      id: row.id,
      voterId: row.voter_id,
      electionId: row.election_id,
      candidateId: row.candidate_id,
      transactionKey: row.transaction_key,
      signature: row.signature,
      commitment: row.commitment,
      timestamp: new Date(row.created_at).toISOString(),
      electionName: row.election_name,
      candidateName: row.candidate_name,
      transactionHash: row.transaction_hash,
      blockHash: row.block_hash,
      blockHeight: row.block_height === null ? null : Number(row.block_height),
      previousHash: row.previous_hash,
      merkleRoot: row.merkle_root,
      nonce: row.nonce === null ? null : Number(row.nonce),
      difficulty: row.difficulty === null ? null : Number(row.difficulty),
      consensus: row.consensus,
      validatorNode: row.validator_node,
    };
  },

  async getVoteLedger(limit = 50) {
    const result = await query(
      `SELECT
         b.hash,
         b.height,
         b.previous_hash,
         b.transaction_hash,
         b.merkle_root,
         b.nonce,
         b.difficulty,
         b.consensus,
         b.validator_node,
         b.payload,
         b.created_at,
         v.transaction_key,
         e.name AS election_name,
         c.name AS candidate_name
       FROM app_vote_blocks b
       JOIN app_votes v ON v.id = b.vote_id
       JOIN app_elections e ON e.id = v.election_id
       JOIN app_candidates c ON c.id = v.candidate_id
       ORDER BY b.height DESC
       LIMIT $1`,
      [Math.min(Math.max(limit, 1), 200)]
    );

    return result.rows.map((row) => ({
      hash: row.hash,
      height: Number(row.height),
      previousHash: row.previous_hash,
      transactionHash: row.transaction_hash,
      transactionKey: row.transaction_key,
      merkleRoot: row.merkle_root,
      nonce: Number(row.nonce),
      difficulty: Number(row.difficulty),
      consensus: row.consensus,
      validatorNode: row.validator_node,
      payload: row.payload,
      electionName: row.election_name,
      candidateName: row.candidate_name,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  },

  async validateVoteLedger() {
    const result = await query(
      `SELECT hash, height, previous_hash, transaction_hash, merkle_root, nonce, difficulty, consensus, created_at
       FROM app_vote_blocks
       ORDER BY height ASC`
    );

    const errors: string[] = [];
    let previousHash = zeroHash;

    for (const row of result.rows) {
      const height = Number(row.height);
      const nonce = Number(row.nonce);
      const difficulty = Number(row.difficulty);
      const timestamp = new Date(row.created_at).toISOString();
      const expectedMerkleRoot = row.transaction_hash;
      const expectedHash = hashVoteBlock({
        height,
        previousHash: row.previous_hash,
        transactionHash: row.transaction_hash,
        merkleRoot: row.merkle_root,
        nonce,
        difficulty,
        consensus: "pow",
        timestamp,
      });

      if (row.height !== 1 && row.previous_hash !== previousHash) {
        errors.push(`Block ${height} previous hash does not link to block ${height - 1}`);
      }

      if (row.height === 1 && row.previous_hash !== zeroHash) {
        errors.push("First vote block must point to the zero hash");
      }

      if (row.merkle_root !== expectedMerkleRoot) {
        errors.push(`Block ${height} Merkle root does not match transaction hash`);
      }

      if (row.hash !== expectedHash) {
        errors.push(`Block ${height} hash does not match block contents`);
      }

      if (difficulty > 0 && !row.hash.startsWith("0".repeat(difficulty))) {
        errors.push(`Block ${height} does not satisfy proof-of-work difficulty`);
      }

      previousHash = row.hash;
    }

    return {
      valid: errors.length === 0,
      errors,
      height: result.rows.length,
      tipHash: result.rows.at(-1)?.hash ?? zeroHash,
    };
  },
};
