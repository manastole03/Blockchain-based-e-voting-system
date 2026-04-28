import type { NextApiRequest, NextApiResponse } from "next";
import { electionDb } from "../../lib/electionDb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { TransactionKey } = req.body;

  if (!TransactionKey) {
    return res.status(400).json({ message: "TransactionKey is required" });
  }

  const vote = await electionDb.findVoteByTransactionKey(TransactionKey);

  if (!vote) {
    return res.status(200).json({ valid: false, message: "Vote not found" });
  }

  return res.status(200).json({
    valid: true,
    vote: {
      transactionKey: vote.transactionKey,
      signature: vote.signature,
      commitment: vote.commitment,
      timestamp: vote.timestamp,
      election: vote.electionName,
      candidate: vote.candidateName,
      transactionHash: vote.transactionHash,
      blockHash: vote.blockHash,
      blockHeight: vote.blockHeight,
      previousHash: vote.previousHash,
      merkleRoot: vote.merkleRoot,
      nonce: vote.nonce,
      difficulty: vote.difficulty,
      consensus: vote.consensus,
      validatorNode: vote.validatorNode,
    },
  });
}
