# Blockchain-Based E-Voting Backend

Production-shaped backend for a blockchain-based voting application. The existing project is a Next.js + TypeScript app, so the backend keeps the same Node/TypeScript stack and adds a dedicated Express API with PostgreSQL persistence, modular blockchain services, pluggable consensus, Docker support, and tests.

## Tech Stack

- Node.js + TypeScript
- Express REST API
- PostgreSQL database
- Native Node `crypto` ECDSA signing on `secp256k1`
- Zod request validation
- Pino structured logging
- Helmet, CORS, and rate limiting
- Vitest + Supertest
- Docker + Docker Compose

## Backend Structure

```text
src/
  app.ts                     Express app composition
  server.ts                  API server entrypoint
  config/                    environment, logger, database pool
  controllers/               HTTP request handlers
  database/                  migration runner
  middleware/                validation, rate limit, error handling
  models/                    blockchain domain types
  repositories/              Postgres and in-memory data adapters
  routes/                    REST route definitions and schemas
  services/                  blockchain, wallet, tx, node, validator logic
  services/consensus/        PoW, PoS, PBFT consensus adapters
  utils/                     hashing, signing, Merkle root helpers
database/schema.sql          database schema and indexes
tests/                       unit and integration tests
```

## Quick Start

Copy environment defaults:

```bash
cp .env.example .env
```

Install dependencies:

```bash
npm install
```

Start Postgres, apply the schema, then run the backend:

```bash
docker compose up -d postgres
npm run db:migrate
npm run backend:dev
```

The API runs at `http://localhost:4000/api`.

## Docker

Run the full backend and database with one command:

```bash
docker compose up --build
```

The backend container applies `database/schema.sql` before starting the API. PostgreSQL data is persisted in the `postgres_data` Docker volume.

## Configuration

Important environment variables:

```text
PORT=4000
DATABASE_URL=postgres://evoting:evoting_password@localhost:5432/evoting
CONSENSUS_ALGORITHM=pow
POW_DIFFICULTY=3
MINING_REWARD=10
MAX_TRANSACTIONS_PER_BLOCK=100
```

Switch consensus by setting `CONSENSUS_ALGORITHM` to `pow`, `pos`, or `pbft`.

## API Overview

All responses use:

```json
{ "success": true, "data": {} }
```

Errors use:

```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

### Health

```bash
curl http://localhost:4000/api/health
```

### Create Wallet

```bash
curl -X POST http://localhost:4000/api/wallets \
  -H "Content-Type: application/json" \
  -d '{ "label": "voter-1" }'
```

The private key is returned only once. Store it client-side; the server persists only the public key and address.

### Get Wallet Balance

```bash
curl http://localhost:4000/api/wallets/0xabc123.../balance
```

### Sign Transaction

This endpoint is provided for development and API testing. In a hardened deployment, perform this signing step in the client or wallet and submit only the public key, signature, and transaction payload to the backend.

```bash
curl -X POST http://localhost:4000/api/transactions/sign \
  -H "Content-Type: application/json" \
  -d '{
    "type": "VOTE",
    "fromAddress": "0xabc123...",
    "amount": 0,
    "payload": {
      "electionId": "student-council",
      "candidateId": "candidate-1"
    },
    "privateKey": "-----BEGIN PRIVATE KEY-----..."
  }'
```

### Create Transaction

Use the `signingPayload`, `signature`, and `publicKey` from the signing response:

```bash
curl -X POST http://localhost:4000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "VOTE",
    "fromAddress": "0xabc123...",
    "toAddress": null,
    "amount": 0,
    "payload": {
      "electionId": "student-council",
      "candidateId": "candidate-1"
    },
    "nonce": 1710000000000,
    "timestamp": "2026-04-27T12:00:00.000Z",
    "signature": "base64-signature",
    "publicKey": "-----BEGIN PUBLIC KEY-----..."
  }'
```

### Validate Transaction

```bash
curl -X POST http://localhost:4000/api/transactions/validate \
  -H "Content-Type: application/json" \
  -d '{ "hash": "64-char-transaction-hash" }'
```

### Pending Transactions

```bash
curl http://localhost:4000/api/transactions/pending
```

### Mine or Create Block

```bash
curl -X POST http://localhost:4000/api/blocks/mine \
  -H "Content-Type: application/json" \
  -d '{ "minerAddress": "0xabc123..." }'
```

### View Blockchain

```bash
curl http://localhost:4000/api/blockchain
```

### View Block by Height or Hash

```bash
curl http://localhost:4000/api/blocks/1
curl http://localhost:4000/api/blocks/000abc...
```

### Validate Blockchain

```bash
curl http://localhost:4000/api/blockchain/validate
```

### Register Node

```bash
curl -X POST http://localhost:4000/api/nodes \
  -H "Content-Type: application/json" \
  -d '{ "url": "http://node-2:4000", "metadata": { "region": "us-west" } }'
```

### Register Validator

Required for Proof of Stake and PBFT:

```bash
curl -X POST http://localhost:4000/api/validators \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xabc123...",
    "publicKey": "-----BEGIN PUBLIC KEY-----...",
    "stake": 100,
    "nodeUrl": "http://node-1:4000"
  }'
```

## Blockchain Implementation

- Blocks store height, previous hash, timestamp, Merkle root, nonce, difficulty, consensus type, validator, metadata, and transactions.
- Transactions are signed ECDSA payloads. The transaction hash is computed from a canonical JSON payload.
- Wallet addresses are derived from `sha256(publicKey)` and stored with public keys only.
- Vote transactions require `payload.electionId` and `payload.candidateId`.
- Pending transactions are stored in the mempool as database rows with `PENDING` status.
- Mining validates pending transactions, rejects invalid ones, adds an optional reward transaction, computes the Merkle root, and persists the confirmed block.
- Chain validation recalculates block hashes, Merkle roots, transaction hashes, signatures, previous-hash links, and consensus rules.

## Consensus

- Proof of Work mines a block hash with leading zeroes based on `POW_DIFFICULTY`.
- Proof of Stake selects from active validators weighted by stake and validates the block validator.
- PBFT models prepare/commit quorum persistence for a local validator set. It requires at least four active validators and stores consensus events for auditability. The interface is isolated so a real network transport can replace the local adapter.

## Database

`database/schema.sql` creates:

- `wallets`
- `transactions`
- `blocks`
- `validators`
- `network_nodes`
- `consensus_events`

Indexes are included for block lookup, pending transaction reads, wallet balance queries, validator selection, and consensus event lookup.

## Tests

```bash
npm test
```

Coverage includes transaction signing and verification, block creation, chain validation, PoW mining, PoS validation, PBFT quorum behavior, and an integration flow through the REST API.
