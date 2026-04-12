import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Return all candidate wallets with their vote counts (tokens received equivalent)
  const candidateData = db.candidates.map((candidate) => {
    const walletTokens = db.votes.filter(
      (v) => v.candidateId === candidate.id
    ).length;

    return {
      name: candidate.name,
      party: candidate.party,
      public_key: `0x${candidate.id.replace(/-/g, "").slice(0, 40).toUpperCase()}`,
      tokens: walletTokens,
      location: candidate.electionId,
    };
  });

  return res.status(200).json({ wallets: candidateData });
}
