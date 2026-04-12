import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../../lib/db";
import { signToken } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const voter = db.voters.find((v) => v.email === email && v.password === password);

    if (!voter) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ id: voter.id, email: voter.email });

    return res.status(200).json({
      user: {
        name: voter.name,
        email: voter.email,
        id: voter.id,
        isLoggedIn: true,
        token,
        locationId: voter.locationId,
      },
      token,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}
