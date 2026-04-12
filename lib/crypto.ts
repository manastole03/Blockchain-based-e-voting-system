import crypto from "crypto";

const CHAIN_SECRET = "BLOCKCHAIN_SIGNING_KEY_EVOTE_2026";

/**
 * Generates a unique blockchain-style transaction key using SHA-256
 * Format: TX-[timestamp_hex]-[hash_prefix]
 */
export function generateTransactionKey(
  voterId: string,
  electionId: string,
  candidateId: string
): string {
  const payload = `${voterId}:${electionId}:${candidateId}:${Date.now()}`;
  const hash = crypto.createHash("sha256").update(payload).digest("hex");
  const ts = Date.now().toString(16).toUpperCase();
  return `TX-${ts}-${hash.slice(0, 16).toUpperCase()}`;
}

/**
 * Generates a cryptographic HMAC-SHA256 signature for the transaction
 * Simulates Hyperledger Fabric endorsement signatures
 */
export function generateSignature(transactionKey: string, voterId: string): string {
  return crypto
    .createHmac("sha256", CHAIN_SECRET)
    .update(`${transactionKey}:${voterId}`)
    .digest("hex");
}

/**
 * Creates a commitment hash (used in Commit-Reveal scheme)
 * Keccak256-equivalent using SHA-256 for demo purposes
 */
export function createCommitment(candidateId: string, salt: string): string {
  return crypto
    .createHash("sha256")
    .update(`${candidateId}:${salt}`)
    .digest("hex");
}

/**
 * Verifies a commitment matches revealed values
 */
export function verifyCommitment(
  commitment: string,
  candidateId: string,
  salt: string
): boolean {
  const computed = createCommitment(candidateId, salt);
  return computed === commitment;
}
