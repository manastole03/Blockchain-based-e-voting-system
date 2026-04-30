# Hyperledger Fabric Integration

This directory contains the real Fabric integration for the voting flow.

- `chaincode/evoting` is JavaScript chaincode using the Fabric Contract API.
- `network.sh` drives the official Fabric `test-network` from `fabric-samples`.
- The Next.js vote API submits votes to Fabric when `FABRIC_ENABLED=true`.

## Local Test Network

From the project root:

```bash
./fabric/network.sh bootstrap
./fabric/network.sh up
./fabric/network.sh deploy
./fabric/network.sh env
```

Copy the printed environment variables into `.env` or export them before starting the
Next.js app. Then run the app normally and cast a vote. The vote is submitted to the
`evoting` chaincode before the PostgreSQL read model is updated.

Stop the network with:

```bash
./fabric/network.sh down
```

## Chaincode Functions

- `CastVote(voteJson)`: records one vote per voter hash per election.
- `ReadVote(transactionKey)`: returns a vote by transaction key.
- `GetVotesByElection(electionId)`: returns all votes for an election.
- `CountVotesByElection(electionId)`: returns per-candidate totals.
- `GetAllVotes()`: returns all vote records.

The chaincode stores a voter hash, not the raw voter id. The app keeps PostgreSQL as
the query/read model for the UI and stores the Fabric transaction id alongside each vote.
