"use strict";

const { Contract } = require("fabric-contract-api");

class EvotingContract extends Contract {
  constructor() {
    super("EVotingContract");
  }

  async InitLedger(ctx) {
    return JSON.stringify({
      initialized: true,
      chaincode: "evoting",
      timestamp: timestampToIso(ctx.stub.getTxTimestamp()),
    });
  }

  async CastVote(ctx, voteJson) {
    const vote = parseJson(voteJson, "vote payload");
    requireField(vote, "transactionKey");
    requireField(vote, "transactionHash");
    requireField(vote, "electionId");
    requireField(vote, "candidateId");
    requireField(vote, "voterHash");
    requireField(vote, "signature");
    requireField(vote, "commitment");

    const voteKey = ctx.stub.createCompositeKey("vote", [vote.transactionKey]);
    const existingVote = await ctx.stub.getState(voteKey);
    if (existingVote && existingVote.length > 0) {
      throw new Error(`Vote transaction ${vote.transactionKey} already exists`);
    }

    const voterElectionKey = ctx.stub.createCompositeKey("voterElection", [
      vote.electionId,
      vote.voterHash,
    ]);
    const existingVoterElection = await ctx.stub.getState(voterElectionKey);
    if (existingVoterElection && existingVoterElection.length > 0) {
      throw new Error("This voter has already voted in this election");
    }

    const txId = ctx.stub.getTxID();
    const fabricTimestamp = timestampToIso(ctx.stub.getTxTimestamp());
    const record = {
      docType: "vote",
      version: 1,
      transactionKey: vote.transactionKey,
      transactionHash: vote.transactionHash,
      electionId: vote.electionId,
      candidateId: vote.candidateId,
      voterHash: vote.voterHash,
      voterCommitment: vote.voterCommitment || null,
      signature: vote.signature,
      commitment: vote.commitment,
      clientTimestamp: vote.timestamp || null,
      fabricTxId: txId,
      fabricTimestamp,
    };

    await ctx.stub.putState(voteKey, Buffer.from(JSON.stringify(record)));
    await ctx.stub.putState(
      voterElectionKey,
      Buffer.from(
        JSON.stringify({
          docType: "voterElection",
          electionId: vote.electionId,
          voterHash: vote.voterHash,
          transactionKey: vote.transactionKey,
          fabricTxId: txId,
          fabricTimestamp,
        })
      )
    );
    await ctx.stub.setEvent(
      "VoteCast",
      Buffer.from(
        JSON.stringify({
          transactionKey: vote.transactionKey,
          electionId: vote.electionId,
          candidateId: vote.candidateId,
          fabricTxId: txId,
        })
      )
    );

    return JSON.stringify(record);
  }

  async ReadVote(ctx, transactionKey) {
    requireString(transactionKey, "transactionKey");
    const voteKey = ctx.stub.createCompositeKey("vote", [transactionKey]);
    const data = await ctx.stub.getState(voteKey);

    if (!data || data.length === 0) {
      throw new Error(`Vote transaction ${transactionKey} does not exist`);
    }

    return data.toString();
  }

  async VoteExists(ctx, transactionKey) {
    requireString(transactionKey, "transactionKey");
    const voteKey = ctx.stub.createCompositeKey("vote", [transactionKey]);
    const data = await ctx.stub.getState(voteKey);
    return data && data.length > 0;
  }

  async GetAllVotes(ctx) {
    const iterator = await ctx.stub.getStateByPartialCompositeKey("vote", []);
    const votes = await readAll(iterator);
    return JSON.stringify(votes);
  }

  async GetVotesByElection(ctx, electionId) {
    requireString(electionId, "electionId");
    const iterator = await ctx.stub.getStateByPartialCompositeKey("voterElection", [electionId]);
    const voterElectionRecords = await readAll(iterator);
    const votes = [];

    for (const record of voterElectionRecords) {
      const voteKey = ctx.stub.createCompositeKey("vote", [record.transactionKey]);
      const data = await ctx.stub.getState(voteKey);
      if (data && data.length > 0) {
        votes.push(JSON.parse(data.toString()));
      }
    }

    return JSON.stringify(votes);
  }

  async CountVotesByElection(ctx, electionId) {
    const votes = JSON.parse(await this.GetVotesByElection(ctx, electionId));
    const totals = votes.reduce((accumulator, vote) => {
      accumulator[vote.candidateId] = (accumulator[vote.candidateId] || 0) + 1;
      return accumulator;
    }, {});

    return JSON.stringify({
      electionId,
      totals,
      totalVotes: votes.length,
    });
  }
}

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid ${label}: ${error.message}`);
  }
}

function requireField(record, field) {
  requireString(record[field], field);
}

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} is required`);
  }
}

async function readAll(iterator) {
  const results = [];

  try {
    while (true) {
      const item = await iterator.next();

      if (item.value && item.value.value) {
        results.push(JSON.parse(item.value.value.toString("utf8")));
      }

      if (item.done) {
        break;
      }
    }
  } finally {
    await iterator.close();
  }

  return results;
}

function timestampToIso(timestamp) {
  if (!timestamp) {
    return new Date().toISOString();
  }

  const rawSeconds = timestamp.seconds;
  const seconds =
    rawSeconds && typeof rawSeconds.toNumber === "function"
      ? rawSeconds.toNumber()
      : Number(rawSeconds || 0);
  const nanos = Number(timestamp.nanos || 0);
  return new Date(seconds * 1000 + Math.floor(nanos / 1_000_000)).toISOString();
}

module.exports = EvotingContract;
