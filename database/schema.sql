CREATE TABLE IF NOT EXISTS wallets (
  address VARCHAR(42) PRIMARY KEY,
  public_key TEXT NOT NULL,
  label VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocks (
  hash CHAR(64) PRIMARY KEY,
  height INTEGER NOT NULL UNIQUE,
  previous_hash CHAR(64) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  merkle_root CHAR(64) NOT NULL,
  nonce BIGINT NOT NULL DEFAULT 0,
  difficulty INTEGER NOT NULL DEFAULT 0,
  consensus VARCHAR(20) NOT NULL,
  validator_address VARCHAR(42),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY,
  hash CHAR(64) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL,
  from_address VARCHAR(42),
  to_address VARCHAR(42),
  amount NUMERIC(30, 10) NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature TEXT,
  public_key TEXT,
  nonce BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  block_hash CHAR(64) REFERENCES blocks(hash) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  CONSTRAINT transactions_type_check CHECK (type IN ('TRANSFER', 'VOTE', 'STAKE', 'REWARD')),
  CONSTRAINT transactions_status_check CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
  CONSTRAINT transactions_amount_check CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_transactions_status_created_at
  ON transactions (status, created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_from_address
  ON transactions (from_address);

CREATE INDEX IF NOT EXISTS idx_transactions_to_address
  ON transactions (to_address);

CREATE INDEX IF NOT EXISTS idx_transactions_block_hash
  ON transactions (block_hash);

CREATE INDEX IF NOT EXISTS idx_blocks_height
  ON blocks (height);

CREATE INDEX IF NOT EXISTS idx_blocks_previous_hash
  ON blocks (previous_hash);

CREATE TABLE IF NOT EXISTS validators (
  address VARCHAR(42) PRIMARY KEY,
  public_key TEXT NOT NULL,
  stake NUMERIC(30, 10) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  node_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT validators_status_check CHECK (status IN ('ACTIVE', 'INACTIVE', 'JAILED')),
  CONSTRAINT validators_stake_check CHECK (stake > 0)
);

CREATE INDEX IF NOT EXISTS idx_validators_status_stake
  ON validators (status, stake DESC);

CREATE TABLE IF NOT EXISTS network_nodes (
  id UUID PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  public_key TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT network_nodes_status_check CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX IF NOT EXISTS idx_network_nodes_status
  ON network_nodes (status);

CREATE TABLE IF NOT EXISTS consensus_events (
  id UUID PRIMARY KEY,
  block_hash CHAR(64) NOT NULL REFERENCES blocks(hash) ON DELETE CASCADE,
  height INTEGER NOT NULL,
  algorithm VARCHAR(20) NOT NULL,
  phase VARCHAR(50) NOT NULL,
  validator_address VARCHAR(42),
  signature TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consensus_events_block_hash
  ON consensus_events (block_hash);

CREATE INDEX IF NOT EXISTS idx_consensus_events_algorithm_phase
  ON consensus_events (algorithm, phase);

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
