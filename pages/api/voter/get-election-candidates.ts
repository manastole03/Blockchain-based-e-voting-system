import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";

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

  const { electionId, locationId } = req.body;

  if (!electionId) {
    return res.status(400).json({ message: "electionId is required" });
  }

  const election = db.elections.find((e) => e._id === electionId);
  if (!election) {
    return res.status(404).json({ message: "Election not found" });
  }

  const candidates = db.candidates.filter((c) => c.electionId === electionId && c.active);

  return res.status(200).json(candidates.map((c) => ({
    id: c.id,
    _id: c.id,
    name: c.name,
    party: c.party,
    image: c.image,
    active: c.active,
    manifesto: c.manifesto,
  })));
}
