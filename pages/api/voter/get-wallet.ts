import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
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

  const voter = db.voters.find((v) => v.id === (decoded as any).id);
  if (!voter) {
    return res.status(404).json({ message: "Voter not found" });
  }

  const wallet = db.wallets.find((w) => w.voterId === voter.id);
  if (!wallet) {
    return res.status(404).json({ message: "Wallet not found" });
  }

  return res.status(200).json({
    wallet: {
      public_key: wallet.publicKey,
      tokens: wallet.tokens,
    },
  });
}
