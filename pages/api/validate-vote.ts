import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { TransactionKey } = req.body;

  if (!TransactionKey) {
    return res.status(400).json({ message: "TransactionKey is required" });
  }

  const vote = db.votes.find((v) => v.transactionKey === TransactionKey);

  if (!vote) {
    return res.status(200).json({ valid: false, message: "Vote not found" });
  }

  const candidate = db.candidates.find((c) => c.id === vote.candidateId);
  const election = db.elections.find((e) => e._id === vote.electionId);

  return res.status(200).json({
    valid: true,
    vote: {
      transactionKey: vote.transactionKey,
      signature: vote.signature,
      commitment: vote.commitment,
      timestamp: vote.timestamp,
      election: election?.name,
      candidate: candidate?.name,
    },
  });
}
