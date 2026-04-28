import type { NextApiRequest, NextApiResponse } from "next";
import { signToken } from "../../../lib/auth";
import { electionDb } from "../../../lib/electionDb";

type LoginRequestBody = {
  email: string;
  password: string;
};

type SuccessResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    isLoggedIn: true;
    token: string;
    locationId?: string;
  };
  token: string;
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
     * Step 1: Allow only POST requests.
     * Reject all other HTTP methods.
     */
    if (req.method !== "POST") {
      return res.status(405).json({
        message: "Method not allowed. Only POST requests are supported.",
      });
    }

    /**
     * Step 2: Extract login credentials from request body.
     */
    const { email, password } = req.body as LoginRequestBody;

    /**
     * Step 3: Validate required fields.
     */
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    /**
     * Step 4: Check if a voter exists with matching credentials.
     */
    const voter = await electionDb.findVoterByCredentials(email, password);

    /**
     * Step 5: If voter is not found, return unauthorized response.
     */
    if (!voter) {
      return res.status(401).json({
        message: "Invalid credentials.",
      });
    }

    /**
     * Step 6: Generate an authentication token for the logged-in voter.
     */
    const token = signToken({
      id: voter.id,
      email: voter.email,
    });

    /**
     * Step 7: Return authenticated user details and token.
     */
    return res.status(200).json({
      user: {
        id: voter.id,
        name: voter.name,
        email: voter.email,
        isLoggedIn: true,
        token,
        locationId: voter.locationId,
      },
      token,
    });
  } catch (error) {
    console.error("Login API error:", error);

    /**
     * Step 8: Handle unexpected server errors.
     */
    return res.status(500).json({
      message: "Internal server error.",
    });
  }
}
