// Backend API client — all calls go to Next.js internal API routes
import {
  AUTH_BYPASS_ENABLED,
  castDevVote,
  getDevElectionCandidates,
  getDevLoginResponse,
  getDevVoterResponse,
  getDevWalletResponse,
  getDevCandidateWallets,
  verifyDevVote,
} from "./devAuth";

const BASE = "/api/voter";

export const Login = async (email: string, password: string) => {
  if (AUTH_BYPASS_ENABLED) return getDevLoginResponse();
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
};

export const GetVoterByID = async (token: string) => {
  if (AUTH_BYPASS_ENABLED) return getDevVoterResponse();
  const res = await fetch(`${BASE}/my-data`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};

export const GetVoterWallet = async (token: string) => {
  if (AUTH_BYPASS_ENABLED) return getDevWalletResponse();
  const res = await fetch(`${BASE}/get-wallet`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};

export const GetElectionCandidates = async (
  token: string,
  electionId: string,
  locationId: string
) => {
  if (AUTH_BYPASS_ENABLED) return getDevElectionCandidates(electionId);
  const res = await fetch(`${BASE}/get-election-candidates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ electionId, locationId }),
  });
  return res.json();
};

export const CastVote = async (token: string, electionId: string, candidateId: string) => {
  if (AUTH_BYPASS_ENABLED) return castDevVote(candidateId);
  const res = await fetch(`${BASE}/cast-vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ electionId, candidateId }),
  });
  return res.json();
};

export const GetCandidateWallets = async () => {
  if (AUTH_BYPASS_ENABLED) return getDevCandidateWallets();
  const res = await fetch(`/api/candidate-wallets`);
  return res.json();
};

export const VerifyVote = async (TransactionKey: string) => {
  if (AUTH_BYPASS_ENABLED) return verifyDevVote(TransactionKey);
  const res = await fetch(`/api/validate-vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ TransactionKey }),
  });
  return res.json();
};
