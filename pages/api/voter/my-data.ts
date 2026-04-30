import type { NextApiRequest, NextApiResponse } from "next";
import { verifyToken } from "../../../lib/auth";
import { electionDb } from "../../../lib/electionDb";
import type { Election } from "../../../lib/db";

type DecodedToken = {
  id: string;
  [key: string]: unknown;
};

type VoterProfile = {
  id: string;
  name: string;
  email: string;
  locationId?: string;
};

type ElectionSummary = {
  voterId?: string;
  status: string;
  electionId: Election | null;
  election: Election | null;
};

type SuccessResponse = {
  voter: VoterProfile;
  elections: ElectionSummary[];
};

type ErrorResponse = {
  message: string;
};

type ApiResponse = SuccessResponse | ErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    /**
     * Step 1: Only allow GET requests.
     */
    if (req.method !== "GET") {
      return res.status(405).json({
        message: "Method not allowed. Only GET requests are supported.",
      });
    }

    /**
     * Step 2: Validate Authorization header.
     * Expected format:
     * Authorization: Bearer <token>
     */
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Unauthorized. Bearer token is required.",
      });
    }

    /**
     * Step 3: Extract token and verify it.
     */
    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token) as DecodedToken | null;

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        message: "Invalid or expired token.",
      });
    }

    /**
     * Step 4: Find the authenticated voter.
     */
    const voter = await electionDb.findVoterById(decoded.id);

    if (!voter) {
      return res.status(404).json({
        message: "Voter not found.",
      });
    }

    /**
     * Step 5: Find all voter-election mappings for this voter.
     */
    const elections = await electionDb.getVoterElections(voter.id);

    /**
     * Step 7: Return voter profile and linked elections.
     */
    return res.status(200).json({
      voter: {
        id: voter.id,
        name: voter.name,
        email: voter.email,
        locationId: voter.locationId,
      },
      elections,
    });
  } catch (error) {
    console.error("Error fetching voter profile and elections:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}
