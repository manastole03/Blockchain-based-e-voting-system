import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";

type DecodedToken = {
  id: string;
  [key: string]: unknown;
};

type WalletResponse = {
  wallet: {
    public_key: string;
    tokens: number;
  };
};

type ErrorResponse = {
  message: string;
};

type ApiResponse = WalletResponse | ErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    /**
     * Step 1: Allow only GET requests.
     * Reject any other HTTP method.
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

    const token = authHeader.split(" ")[1];

    /**
     * Step 3: Verify the token.
     * If the token is invalid or expired, deny access.
     */
    const decoded = verifyToken(token) as DecodedToken | null;

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        message: "Invalid or expired token.",
      });
    }

    /**
     * Step 4: Find the authenticated voter in the database.
     */
    const voter = db.voters.find((item) => item.id === decoded.id);

    if (!voter) {
      return res.status(404).json({
        message: "Voter not found.",
      });
    }

    /**
     * Step 5: Find the wallet associated with the voter.
     */
    const wallet = db.wallets.find((item) => item.voterId === voter.id);

    if (!wallet) {
      return res.status(404).json({
        message: "Wallet not found.",
      });
    }

    /**
     * Step 6: Return wallet details.
     * Expose only the fields needed by the client.
     */
    return res.status(200).json({
      wallet: {
        public_key: wallet.publicKey,
        tokens: wallet.tokens,
      },
    });
  } catch (error) {
    console.error("Error fetching wallet details:", error);

    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}
