# Blockchain-Based E-Voting System

A secure, transparent, and auditable e-voting platform combining a **production-shaped custom blockchain backend** (Node.js + TypeScript + PostgreSQL) with a **Hyperledger Fabric smart-contract architecture** for permissioned election management.

This project extends earlier research work on blockchain-based voting by moving from a high-level conceptual framework to a more structured, smart-contract-driven and REST-API-driven architecture with stronger election control, vote integrity, auditability, and deployment readiness.

---

## Table of Contents

1. [Research Foundation](#1-research-foundation)
2. [Project Description](#2-project-description)
3. [What Is Improved in This Advanced Version](#3-what-is-improved-in-this-advanced-version)
4. [Objectives](#4-objectives)
5. [Key Features](#5-key-features)
6. [Tech Stack](#6-tech-stack)
7. [Project Structure](#7-project-structure)
8. [High-Level Architecture](#8-high-level-architecture)
9. [Quick Start — Custom Blockchain Backend](#9-quick-start--custom-blockchain-backend)
10. [Docker](#10-docker)
11. [Configuration](#11-configuration)
12. [API Reference](#12-api-reference)
13. [Blockchain Implementation](#13-blockchain-implementation)
14. [Consensus Algorithms](#14-consensus-algorithms)
15. [Database](#15-database)
16. [Tests](#16-tests)
17. [Hyperledger Fabric Chaincode](#17-hyperledger-fabric-chaincode)
18. [Deployment](#18-deployment)
19. [Project Screenshots](#19-project-screenshots)

---

## 1. Research Foundation

This repository is based on the following research work:

- **Paper:** *Hyperledger-Based Blockchain Technology for Data Security in E-Voting Systems*
- **Abstract / Initial Project Title:** *A Framework to Make Voting System Using Blockchain Technology*

The research motivates blockchain-based voting because blockchain offers:

- Decentralization
- Immutability
- Transparency
- Auditability
- Secure digital transactions

The paper proposes using **Hyperledger Fabric** because of its permissioned architecture, access control support, organizations, nodes, channels, and chaincode-based execution model. It further maps the system to a web architecture using **Next.js**, **Node.js**, Fabric SDKs, and containerized hosting on cloud platforms.

---

## 2. Project Description

Traditional voting systems and many electronic voting implementations face major challenges such as:

- Risk of tampering
- Lack of transparency
- Weak auditability
- Centralized control
- Operational complexity during election setup and counting
- Trust deficit among voters

The existing project is a **Next.js + TypeScript** app. This backend keeps the same Node/TypeScript stack and adds:

- A dedicated Express REST API with PostgreSQL persistence
- Modular blockchain services with pluggable consensus
- Docker support and structured tests

The Hyperledger Fabric layer introduces a smart-contract-driven architecture with:

- Explicit **election lifecycle management**
- Stricter **one-voter-one-vote enforcement**
- **Tokenized ballot issuance**
- Structured **chaincode interfaces**
- Improved **audit events and result finalization**
- Better separation of responsibilities across components
- Deployment-ready project structure

---

## 3. What Is Improved in This Advanced Version

Compared with the original conceptual model, this repository introduces the following improvements:

### 3.1 Explicit Election Phases
- Registration
- Candidate Approval
- Voting Open
- Voting Closed
- Tally Finalized

### 3.2 One-Person-One-Vote Enforcement
- Each voter has a verified identity record.
- Each voter can cast only one ballot in a given election.

### 3.3 Privacy-Aware Ballot Storage
- Instead of storing plain voting choices directly, the system stores a **ballot commitment hash** on-chain.
- This reduces exposure of sensitive voting information while preserving auditability.

### 3.4 Auditable Result Finalization
- All state transitions and major voting actions are recorded on the ledger.
- Final tally can be independently verified against committed voting events.

### 3.5 Cleaner Smart Contract Structure
- Separate functions for election creation, voter registration, candidate registration, vote casting, tallying, and query operations.

### 3.6 Election Lifecycle State Machine
- Draft
- Registration Open
- Voting Open
- Voting Closed
- Result Finalized

### 3.7 Explicit Smart Contract Interfaces
- Cleaner signatures
- Easier testing
- Clearer rubric alignment

### 3.8 Vote Integrity Controls
- One-vote-per-voter restriction
- Immutable on-chain transaction log
- Election-specific vote validation

### 3.9 Auditability
- Event emission for key actions
- Transparent election closure and result publication

### 3.10 Future Privacy Enhancements
- Vote commitment hash
- Optional anonymous credential support
- Optional zero-knowledge or commit-reveal based design in future versions

---

## 4. Objectives

The main objective of this project is to build a blockchain-based voting system that is:

- **Secure** — votes cannot be altered after submission
- **Transparent** — the process is verifiable and auditable
- **Private** — voter identity and vote secrecy are preserved
- **Traceable** — authorized audit events can be inspected
- **Scalable** — suitable for institution-level or department-level elections
- **Extensible** — can be improved into a production-grade election platform

---

## 5. Key Features

### 5.1 Current / Planned Features

- Voter registration and eligibility verification
- Candidate registration
- Election creation and scheduling
- Ballot / token issuance to eligible voters
- One-time vote casting
- Prevention of double voting
- Blockchain-backed immutable vote records
- Election status tracking
- Vote tally and result finalization
- Audit log generation
- Permissioned access through Hyperledger Fabric identities
- REST API middleware for frontend integration
- Containerized deployment using Docker

### 5.2 Custom Blockchain Backend Features

- ECDSA-signed transactions on `secp256k1`
- Pluggable consensus: Proof of Work, Proof of Stake, PBFT
- Mempool with pending transaction management
- Merkle root computation per block
- Chain validation (hashes, signatures, previous-hash links, consensus rules)
- Wallet address derivation from `sha256(publicKey)`
- Structured Pino logging, Helmet, CORS, and rate limiting

---

## 6. Tech Stack

### Custom Blockchain Backend
- Node.js + TypeScript
- Express REST API
- PostgreSQL database
- Native Node `crypto` ECDSA signing on `secp256k1`
- Zod request validation
- Pino structured logging
- Helmet, CORS, and rate limiting
- Vitest + Supertest
- Docker + Docker Compose

### Hyperledger Fabric Layer
- Hyperledger Fabric (permissioned blockchain)
- JavaScript / Node.js chaincode
- Fabric SDK (Node.js)
- Next.js frontend
- Docker + Docker Compose

---

## 7. Project Structure

### 7.1 Custom Blockchain Backend

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

### 7.2 Hyperledger Fabric Layer

```text
hyperledger-evoting-advanced-starter/
├── README.md
├── github_repository_link.txt
├── .gitignore
├── docs/
│   ├── architecture.md
│   ├── algorithm_advancements.md
│   └── rubric_mapping.md
└── chaincode-javascript/
    ├── package.json
    ├── index.js
    └── lib/
        └── election-contract.js
└── frontend/
```

---

## 8. High-Level Architecture

```mermaid
flowchart TD
    U[Voter / Election Officer / Auditor] --> F[Frontend - Next.js / Web App]
    F --> A[API Layer - Node.js / Express]
    A --> SDK[Hyperledger Fabric SDK]
    SDK --> CC[Chaincode / Smart Contract]
    CC --> L[(Ledger + World State)]

    subgraph Fabric Network
        O1[Org 1 - Election Authority]
        O2[Org 2 - Voter Organization]
        O3[Org 3 - Candidate Organization]
        O4[Org 4 - Auditor / Observer]
    end

    SDK --> O1
    SDK --> O2
    SDK --> O3
    SDK --> O4
```

### 8.1 Fabric Organization and Election Channel Design

The following diagram represents a deployment-oriented interpretation of the architecture proposed in the research paper. The Election Authority manages the election, candidate peers are grouped logically, voter peers belong to different departments/organizations, and voting transactions are executed through permissioned Fabric channels and smart contracts.

```mermaid
flowchart TB
    subgraph EA[Org 1 - Election Authority]
        Admin[Admin Peer]
        CA[Certificate Authority]
    end

    subgraph CO[Org 2 - Candidate Organization]
        Cand1[Candidate Peer 1]
        Cand2[Candidate Peer 2]
    end

    subgraph VO1[Org 3 - Department 1 / Voter Org]
        V1[Voter Peer 1]
    end

    subgraph VO2[Org 4 - Department 2 / Voter Org]
        V2[Voter Peer 2]
    end

    subgraph VO3[Org 5 - Department 3 / Voter Org]
        V3[Voter Peer 3]
    end

    Orderer[Ordering Service]
    Contract[Election Smart Contract / Chaincode]
    Ledger[(Ledger + World State)]

    Admin --> Contract
    V1 --> Contract
    V2 --> Contract
    V3 --> Contract
    Cand1 --> Contract
    Cand2 --> Contract

    Contract --> Orderer
    Orderer --> Ledger

    V1 -. Private Election Channel .- Cand1
    V2 -. Private Election Channel .- Cand1
    V3 -. Private Election Channel .- Cand2
    Admin -. Governance / Control Access .- CA
```

---

## 9. Quick Start — Custom Blockchain Backend

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

---

## 10. Docker

Run the full backend and database with one command:

```bash
docker compose up --build
```

The backend container applies `database/schema.sql` before starting the API. PostgreSQL data is persisted in the `postgres_data` Docker volume.

---

## 11. Configuration

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

---

## 12. API Reference

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

> This endpoint is provided for development and API testing. In a hardened deployment, perform this signing step in the client or wallet and submit only the public key, signature, and transaction payload to the backend.

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

---

## 13. Blockchain Implementation

- Blocks store height, previous hash, timestamp, Merkle root, nonce, difficulty, consensus type, validator, metadata, and transactions.
- Transactions are signed ECDSA payloads. The transaction hash is computed from a canonical JSON payload.
- Wallet addresses are derived from `sha256(publicKey)` and stored with public keys only.
- Vote transactions require `payload.electionId` and `payload.candidateId`.
- Pending transactions are stored in the mempool as database rows with `PENDING` status.
- Mining validates pending transactions, rejects invalid ones, adds an optional reward transaction, computes the Merkle root, and persists the confirmed block.
- Chain validation recalculates block hashes, Merkle roots, transaction hashes, signatures, previous-hash links, and consensus rules.

---

## 14. Consensus Algorithms

### Proof of Work (PoW)
Mines a block hash with leading zeroes based on `POW_DIFFICULTY`.

### Proof of Stake (PoS)
Selects from active validators weighted by stake and validates the block validator.

### PBFT
Models prepare/commit quorum persistence for a local validator set. It requires at least four active validators and stores consensus events for auditability. The interface is isolated so a real network transport can replace the local adapter.

---

## 15. Database

`database/schema.sql` creates the following tables:

- `wallets`
- `transactions`
- `blocks`
- `validators`
- `network_nodes`
- `consensus_events`

Indexes are included for block lookup, pending transaction reads, wallet balance queries, validator selection, and consensus event lookup.

---

## 16. Tests

```bash
npm test
```

Coverage includes:

- Transaction signing and verification
- Block creation
- Chain validation
- PoW mining
- PoS validation
- PBFT quorum behavior
- Integration flow through the REST API

---

## 17. Hyperledger Fabric Chaincode

### 17.1 Setup

#### Required Software
- Node.js 18+
- npm 9+
- Docker
- Docker Compose (or Docker Desktop)
- Hyperledger Fabric test network or a Fabric deployment environment

#### Optional but Recommended
- Git
- VS Code
- Postman / Bruno for API testing
- A Fabric CA setup for certificate-based identity issuance

#### Chaincode Setup

```bash
cd chaincode-javascript
npm install
```

### 17.2 Smart Contract Overview

The smart contract defines a Fabric chaincode component called `ElectionContract`.

#### Main Interfaces / Signatures

| Function | Description |
|---|---|
| `InitLedger(ctx)` | Bootstrap the ledger |
| `CreateElection(ctx, electionId, title, startTime, endTime, adminId)` | Create a new election |
| `RegisterVoter(ctx, electionId, voterId, voterNameHash, department, eligibilityHash)` | Register an eligible voter |
| `RegisterCandidate(ctx, electionId, candidateId, candidateName, partyName)` | Register a candidate |
| `OpenVoting(ctx, electionId)` | Transition election to voting open |
| `CastVote(ctx, electionId, voterId, candidateId, ballotCommitment)` | Cast a ballot (one per voter) |
| `CloseVoting(ctx, electionId)` | Close the voting phase |
| `FinalizeTally(ctx, electionId)` | Compute and publish final results |
| `GetElection(ctx, electionId)` | Query election details |
| `GetCandidate(ctx, electionId, candidateId)` | Query candidate details |
| `GetVoter(ctx, electionId, voterId)` | Query voter record |
| `GetResults(ctx, electionId)` | Query final results |
| `GetElectionAuditTrail(ctx, electionId)` | Query full audit trail |

---

## 18. Deployment

### 18.1 Local Draft Usage

This repository includes a **starter draft** of the Hyperledger chaincode alongside the production-shaped Express backend. You can use the chaincode layer in three steps:

1. Review the smart contract draft in `chaincode-javascript/lib/election-contract.js`
2. Customize the ledger schema and validation rules for your institution or election model
3. Deploy the chaincode to a Hyperledger Fabric test network

### 18.2 Typical Deployment Flow

1. Start a Hyperledger Fabric network
2. Package and install the JavaScript chaincode
3. Approve and commit the chaincode definition
4. Invoke chaincode methods using the Fabric SDK, CLI, or middleware APIs
5. Build a web app in Next.js / React and connect it through a Node.js backend

### 18.3 Example Future Deployment Architecture

| Layer | Technology |
|---|---|
| Frontend | Next.js / React portal for admin, voter, and candidate dashboards |
| Backend / API | Node.js / Express / Fabric SDK |
| Blockchain | Hyperledger Fabric peers, orderers, CAs |
| Storage | Ledger state + optional encrypted off-chain metadata store |
| Infrastructure | Dockerized services on AWS / GCP / local server cluster |

---

## 19. Project Screenshots

![Screenshot 1](https://github.com/user-attachments/assets/d0297b2f-80b7-4bd5-9f89-a13afb848ee3)

![Screenshot 2](https://github.com/user-attachments/assets/b71f579c-efbf-4229-88d9-9e1be35923bf)

![Screenshot 3](https://github.com/user-attachments/assets/eeaafc57-7b9c-42be-be79-53b08f4a60bd)

![Screenshot 4](https://github.com/user-attachments/assets/7477b68e-f2b7-43d0-8e1a-c0f00f0b04e9)

![Screenshot 5](https://github.com/user-attachments/assets/b66a0a8a-4256-45ca-9ea7-12c40d1cc622)

![Screenshot 6](https://github.com/user-attachments/assets/265ebe35-eea9-4df3-8d70-6e2aa7b927e8)

![Screenshot 7](https://github.com/user-attachments/assets/8ce784cc-9e54-43cf-852a-f13d628752c3)

![Screenshot 8](https://github.com/user-attachments/assets/083b3b74-0c36-461e-b99e-7d6d435b3bbb)

![Screenshot 9](https://github.com/user-attachments/assets/9d98facf-01e5-4b3c-b441-2477ef0359e8)

![Screenshot 10](https://github.com/user-attachments/assets/c06f03de-2703-42c7-a903-b7c0bf1e25af)
