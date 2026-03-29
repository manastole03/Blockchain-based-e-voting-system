# EBA E-Voting Project - Implementation Overview

## Project Idea

**Blockchain-Based E-Voting System** for small-scale organizational elections (student groups, clubs, etc.)

### Key Objectives
- Enforce election integrity through on-chain smart contracts
- Prevent duplicate or unauthorized voting (one-vote-per-voter rule)
- Enable independent auditing of election results
- Keep personally identifying voter information off-chain for privacy
- Provide tamper-evident, transparent voting records

### Scope
- **Scale**: Small-scale organizational elections (limited voters)
- **Platform**: Ethereum (Sepolia testnet or local EVM)
- **NOT intended for**: National-scale voting systems

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    E-Voting System                          │
├──────────────────┬──────────────────┬──────────────────────┤
│                  │                  │                      │
│  Smart Contract  │  Off-Chain       │  Web Frontend        │
│  (On-chain)      │  Services        │  (React)             │
│                  │                  │                      │
│  • Elections     │ • Voter          │ • MetaMask           │
│  • Candidates    │   Registration   │   Integration        │
│  • Voting        │ • Verification   │ • Vote Submission    │
│  • Results       │ • Authentication │ • Results Display    │
│                  │                  │                      │
└──────────────────┴──────────────────┴──────────────────────┘
```

### Off-Chain to On-Chain Flow

1. **Admin** deploys contract and creates election
2. **Off-chain service** verifies voter eligibility and authorizes wallet addresses
3. **Voter** connects wallet to web interface
4. **Smart contract** checks authorization, prevents duplicate votes, records on blockchain
5. **Anyone** can query contract to audit results after election closes

---

## Current Implementation Status

### ✅ Completed

#### 1. Smart Contract (`contracts/voting.sol`)
- **Language**: Solidity 0.8.20
- **Base**: OpenZeppelin `Ownable` for access control

**Key Features Implemented:**

##### Data Structures
```solidity
enum ElectionState { Created, Open, Closed }

struct Candidate {
    uint id;
    string name;
    string description;
    uint voteCount;
}

struct Election {
    uint id;
    string title;
    string description;
    ElectionState state;
    uint startTime;
    uint endTime;
    Candidate[] candidates;
    uint totalVotes;
}
```

##### Core Functions
- `createElection(title, description, startTime, endTime)` - Admin only
- `addCandidate(electionId, name, description)` - Admin only, before voting opens
- `authorizeVoter(electionId, voterAddress)` - Admin only, for off-chain verification
- `authorizeVoters(electionId, voterAddresses[])` - Bulk voter authorization
- `openElection(electionId)` - Transition from Created to Open state
- `castVote(electionId, candidateId)` - Submit vote (one-vote enforcement)
- `closeElection(electionId)` - Finalize voting and transition to Closed state

##### Query Functions
- `getElection(electionId)` - Get election details
- `getCandidate(electionId, candidateId)` - Get specific candidate info
- `getCandidates(electionId)` - Get all candidates for an election
- `getResults(electionId)` - Get final results (only when closed)
- `hasVoterVoted(electionId, voterAddress)` - Check if voter participated
- `isVoterAuthorized(electionId, voterAddress)` - Check voter authorization
- `getElectionCount()` - Get total number of elections

##### Security Features
- **Access Control**: OpenZeppelin `Ownable` (admin-only functions)
- **One-Vote Enforcement**: `hasVoted` mapping prevents duplicate votes per election
- **Authorization**: Per-election voter authorization
- **State Validation**: Modifiers enforce proper election state transitions
- **Events**: Comprehensive audit trail (6 events)

##### Events Emitted
- `ElectionCreated` - When new election is created
- `CandidateAdded` - When candidate is registered
- `VoterAuthorized` - When voter is approved
- `VoteCast` - When vote is submitted (with timestamp for audit)
- `ElectionStateChanged` - When state transitions
- `ElectionClosed` - When election results are finalized

#### 2. Project Configuration
- **Hardhat Config** (`hardhat.config.js`)
  - Solidity version: 0.8.20
  - Networks: hardhat, localhost, sepolia
  - Paths configured for contracts, tests, artifacts

- **Package.json**
  - Installed dependencies:
    - `hardhat` - Ethereum development environment
    - `@openzeppelin/contracts` - Standard contract libraries
    - `ethers` - Web3 library for contract interaction
    - `dotenv` - Environment variable management
    - `@nomicfoundation/hardhat-toolbox@hh2` - Hardhat plugins bundle
    - `chai` - Testing framework
    - `hardhat-gas-reporter` - Gas cost analysis
    - Additional supporting packages

#### 3. Compilation Validation
- ✅ Contract compiles successfully with Solidity 0.8.20
- ✅ No syntax or structural errors
- ✅ All imports and dependencies resolved

---

## Project Structure

```
EBA-EVoting-Project/
├── contracts/
│   └── voting.sol                 # Main smart contract (IMPLEMENTED)
├── scripts/
│   └── deploy.js                  # Deployment script (TODO)
├── test/
│   └── voting.test.js             # Unit tests (TODO)
├── frontend/                       # React app (TODO)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── hardhat.config.js              # Hardhat configuration (IMPLEMENTED)
├── package.json                   # Dependencies (IMPLEMENTED)
├── IMPLEMENTATION.md              # This file
└── README.md                       # Project README
```

---

## Next Steps (TODO)

### Phase 1: Testing
1. **Write comprehensive tests** (`test/voting.test.js`)
   - Test election creation and state transitions
   - Test candidate registration
   - Test voter authorization
   - Test vote casting and one-vote enforcement
   - Test result queries
   - Test access control and permissions
   - Edge cases and error handling

2. **Run tests locally**
   ```bash
   npx hardhat test
   ```

### Phase 2: Deployment
1. **Create deployment script** (`scripts/deploy.js`)
   - Deploy contract logic
   - Output contract address and ABI
   - Save deployment info for frontend

2. **Test deployment locally**
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. **Configure testnet variables**
   - Create `.env` file with:
     - `SEPOLIA_RPC_URL` (from Alchemy/Infura)
     - `PRIVATE_KEY` (test wallet)

### Phase 3: Off-Chain Registration Service
1. Build voter registration backend
2. Implement voter verification logic
3. Create API to authorize voters on-chain
4. Secure off-chain voter database

### Phase 4: Frontend Development
1. Set up Vite React app in `frontend/` folder
2. Implement MetaMask wallet connection
3. Create election management UI
4. Build vote submission form
5. Display results after election closes

### Phase 5: Integration Testing
1. End-to-end testing (register → vote → audit)
2. Local testnet deployment
3. Sepolia testnet deployment
4. Public demonstration

---

## Key Design Decisions

### 1. Multiple Elections Support
- Contract supports multiple concurrent elections
- Per-election voter authorization and voting tracking
- Scalable to any number of elections

### 2. Off-Chain Voter Verification
- Voter identity kept private (off-chain)
- Only verified wallet addresses authorized
- Admin controls authorization via contract functions

### 3. State Machine
```
Created → Open → Closed
  ↓
(Add candidates only in Created state)
(Cast votes only in Open state)
(Query results only in Closed state)
```

### 4. Audit Trail
- All significant actions emit events
- Blockchain provides tamper-evident log
- Anyone can query historical events

### 5. OpenZeppelin Integration
- Uses battle-tested, audited contracts
- `Ownable` for simple access control
- Future: Consider `AccessControl` for role-based permissions

---

## Compilation & Build Commands

```bash
# Install dependencies
npm install --legacy-peer-deps

# Compile smart contract
npx hardhat compile

# Run tests (when implemented)
npx hardhat test

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost

# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia

# Start local test node
npx hardhat node
```

---

## Environment Setup

### Required Files to Create
1. **`.env`** (for testnet deployment)
   ```
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
   PRIVATE_KEY=your_private_key_here
   ```

2. **`scripts/deploy.js`** (deployment automation)

3. **`test/voting.test.js`** (comprehensive test suite)

4. **`frontend/`** (React application)

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Blockchain** | Ethereum (Sepolia/Local EVM) |
| **Smart Contract** | Solidity 0.8.20 |
| **Development** | Hardhat 3.x |
| **Web3 Library** | ethers.js |
| **Contract Standards** | OpenZeppelin v5.x |
| **Testing** | Chai + Hardhat plugins |
| **Frontend** | React (Vite) |
| **Wallet** | MetaMask |

---

## Security Considerations

### Implemented
- ✅ Access control (admin-only functions)
- ✅ One-vote-per-voter enforcement
- ✅ Election state validation
- ✅ Input validation (non-zero addresses, valid IDs)

### Future Considerations
- ⚠️ Role-based access control (admin, auditor)
- ⚠️ Signature-based voter authorization (prevent front-running)
- ⚠️ Emergency pause mechanism
- ⚠️ Formal contract audit
- ⚠️ ZK proofs for voter privacy

---

## Notes for Future Development

1. **Solidity Version**: Currently using 0.8.20 to ensure OpenZeppelin v5 compatibility
2. **Admin Model**: Currently single admin (contract owner). Consider multi-sig for production
3. **Gas Optimization**: Contract not optimized for minimal gas costs; optimization possible
4. **Voter Privacy**: Current system links wallet to election. Consider zero-knowledge proofs for enhanced privacy
5. **Scalability**: Current design suitable for small-scale elections; not suitable for millions of voters

---

## References

- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts/5.x/
- **Solidity Documentation**: https://docs.soliditylang.org/
- **Hardhat Documentation**: https://hardhat.org/docs
- **ethers.js Documentation**: https://docs.ethers.org/v6/
- **Project Proposal**: See README.md for full project proposal details

---

**Last Updated**: March 29, 2026  
**Status**: Smart contract complete and validated, awaiting tests and deployment scripts
