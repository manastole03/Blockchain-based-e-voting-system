import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";

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
  status: string;
  election: {
    _id: string;
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    [key: string]: unknown;
  } | null;
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
    const voter = db.voters.find((item) => item.id === decoded.id);

    if (!voter) {
      return res.status(404).json({
        message: "Voter not found.",
      });
    }

    /**
     * Step 5: Find all voter-election mappings for this voter.
     */
    const voterElectionMappings = db.voterElections.filter(
      (item) => item.voterId === voter.id
    );

    /**
     * Step 6: Attach election details to each voter-election mapping.
     */
    const elections: ElectionSummary[] = voterElectionMappings.map((mapping) => {
      const election = db.elections.find(
        (item) => item._id === mapping.electionId
      );

      return {
        status: mapping.status,
        election: election
          ? {
              ...election,
            }
          : null,
      };
    });

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
