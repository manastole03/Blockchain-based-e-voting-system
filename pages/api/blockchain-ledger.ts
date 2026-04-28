import type { NextApiRequest, NextApiResponse } from "next";
import { electionDb } from "../../lib/electionDb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const limit = limitParam ? Number(limitParam) : 50;
  const [chain, validation] = await Promise.all([
    electionDb.getVoteLedger(Number.isFinite(limit) ? limit : 50),
    electionDb.validateVoteLedger(),
  ]);

  return res.status(200).json({
    validation,
    chain,
  });
}
