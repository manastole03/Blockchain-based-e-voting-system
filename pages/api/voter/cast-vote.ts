import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { verifyToken } from "../../../lib/auth";
import {
  generateTransactionKey,
  generateSignature,
} from "../../../lib/crypto";
import { electionDb } from "../../../lib/electionDb";

type ApiResponse =
  | {
      message: string;
    }
  | {
      message: string;
      transactionKey: string;
      signature: string;
      TransactionKey: string;
      SignatureGenerated: string;
      transactionHash: string;
      blockHash: string;
      blockHeight: number;
    };

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
     * Step 1: Allow only POST requests.
     * Any other HTTP method should be rejected.
     */
    if (req.method !== "POST") {
      return res.status(405).json({
        message: "Method not allowed. Only POST requests are supported.",
      });
    }

    /**
     * Step 2: Extract and validate the Authorization header.
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
     * Step 3: Verify JWT or access token.
     * If token is invalid or expired, deny access.
     */
    const decoded = verifyToken(token) as DecodedToken | null;

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        message: "Invalid or expired token.",
      });
    }

    /**
     * Step 4: Read and validate request body.
     * Required fields:
     * - electionId
     * - candidateId
     */
    const { electionId, candidateId } = req.body;

    if (!electionId || !candidateId) {
      return res.status(400).json({
        message: "Both electionId and candidateId are required.",
      });
    }

    const voterId = decoded.id;

    /**
     * Step 5: Ensure the voter has not already voted in this election.
     * One voter can cast only one vote per election.
     */
    /**
     * Step 5: Generate blockchain-style transaction metadata.
     * - transactionKey: unique key for this vote transaction
     * - signature: cryptographic signature tied to voter identity
     */
    const transactionKey = generateTransactionKey(
      voterId,
      electionId,
      candidateId
    );

    const signature = generateSignature(transactionKey, voterId);

    const commitment = crypto
      .createHash("sha256")
      .update(`${candidateId}:${voterId}:${Date.now()}`)
      .digest("hex");

    /**
     * Step 6: Persist the vote atomically in PostgreSQL.
     */
    const vote = await electionDb.castVote({
      voterId,
      electionId,
      candidateId,
      transactionKey,
      signature,
      commitment,
    });

    /**
     * Step 7: Return success response.
     */
    return res.status(200).json({
      message: "Vote cast successfully.",
      transactionKey: vote.transactionKey,
      signature: vote.signature,
      TransactionKey: vote.transactionKey,
      SignatureGenerated: vote.signature,
      transactionHash: vote.transactionHash,
      blockHash: vote.blockHash,
      blockHeight: vote.blockHeight,
    });
  } catch (error: any) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error("Error while casting vote:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}
