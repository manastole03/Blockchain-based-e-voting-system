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

  // Get elections attached to this voter
  const voterElections = db.voterElections
    .filter((ve) => ve.voterId === voter.id)
    .map((ve) => {
      const election = db.elections.find((e) => e._id === ve.electionId);
      return { status: ve.status, electionId: election };
    });

  return res.status(200).json({
    voter: {
      id: voter.id,
      name: voter.name,
      email: voter.email,
      locationId: voter.locationId,
    },
    elections: voterElections,
  });
}
