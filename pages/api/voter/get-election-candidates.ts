import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";

type CandidateResponse = {
  id: string;
  _id: string;
  name: string;
  party: string;
  image?: string;
  active: boolean;
  manifesto?: string;
};

type ErrorResponse = {
  message: string;
};

type ApiResponse = CandidateResponse[] | ErrorResponse;

type DecodedToken = {
  id: string;
  [key: string]: unknown;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    /**
     * Step 1: Only allow POST requests.
     * Reject any other HTTP method.
     */
    if (req.method !== "POST") {
      return res.status(405).json({
        message: "Method not allowed. Only POST requests are supported.",
      });
    }

    /**
     * Step 2: Read the Authorization header.
     * Expected format:
     * Authorization: Bearer <token>
     */
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Unauthorized. Bearer token is required.",
      });
    }

    const token = authHeader.split(" ")[1];

    /**
     * Step 3: Verify the token.
     * If verification fails, reject the request.
     */
    const decoded = verifyToken(token) as DecodedToken | null;

    if (!decoded) {
      return res.status(401).json({
        message: "Invalid or expired token.",
      });
    }

    /**
     * Step 4: Extract request body parameters.
     * electionId is required.
     * locationId is optional in this implementation,
     * though currently it is not being used in the filtering logic.
     */
    const { electionId, locationId } = req.body;

    if (!electionId) {
      return res.status(400).json({
        message: "electionId is required.",
      });
    }

    /**
     * Step 5: Check whether the election exists.
     */
    const election = db.elections.find((item) => item._id === electionId);

    if (!election) {
      return res.status(404).json({
        message: "Election not found.",
      });
    }

    /**
     * Step 6: Fetch all active candidates
     * that belong to the specified election.
     */
    const candidates = db.candidates.filter(
      (candidate) =>
        candidate.electionId === electionId && candidate.active === true
    );

    /**
     * Step 7: Transform candidate records into
     * a consistent API response format.
     */
    const responseData: CandidateResponse[] = candidates.map((candidate) => ({
      id: candidate.id,
      _id: candidate.id,
      name: candidate.name,
      party: candidate.party,
      image: candidate.image,
      active: candidate.active,
      manifesto: candidate.manifesto,
    }));

    /**
     * Step 8: Return the filtered candidate list.
     */
    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching candidates:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}
