import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";
import { generateTransactionKey, generateSignature } from "../../../lib/crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { electionId, candidateId } = req.body;

  if (!electionId || !candidateId) {
    return res.status(400).json({ message: "electionId and candidateId are required" });
  }

  const voterId = (decoded as any).id;

  // Check voter hasn't already voted in this election
  const existingVote = db.votes.find(
    (v) => v.voterId === voterId && v.electionId === electionId
  );
  if (existingVote) {
    return res.status(409).json({ message: "You have already voted in this election" });
  }

  // Check voter wallet has tokens
  const wallet = db.wallets.find((w) => w.voterId === voterId);
  if (!wallet || wallet.tokens <= 0) {
    return res.status(403).json({ message: "No vote tokens available" });
  }

  // Check candidate exists
  const candidate = db.candidates.find(
    (c) => c.id === candidateId && c.electionId === electionId && c.active
  );
  if (!candidate) {
    return res.status(404).json({ message: "Candidate not found" });
  }

  // Generate blockchain-style transaction artifacts
  const TransactionKey = generateTransactionKey(voterId, electionId, candidateId);
  const SignatureGenerated = generateSignature(TransactionKey, voterId);

  // Record the vote
  db.votes.push({
    id: `vote-${db.votes.length + 1}`,
    voterId,
    electionId,
    candidateId,
    transactionKey: TransactionKey,
    signature: SignatureGenerated,
    commitment: require("crypto")
      .createHash("sha256")
      .update(`${candidateId}:${voterId}:${Date.now()}`)
      .digest("hex"),
    timestamp: new Date().toISOString(),
  });

  // Deduct token from wallet
  wallet.tokens -= 1;

  // Update candidate vote count
  candidate.voteCount = (candidate.voteCount || 0) + 1;

  // Update voter-election status to complete
  const voterElection = db.voterElections.find(
    (ve) => ve.voterId === voterId && ve.electionId === electionId
  );
  if (voterElection) {
    voterElection.status = "complete";
  }

  return res.status(200).json({
    TransactionKey,
    SignatureGenerated,
    message: "Vote cast successfully",
  });
}
