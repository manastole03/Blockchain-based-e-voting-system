export type ConsensusName = "pow" | "pos" | "pbft";

export type TransactionType = "TRANSFER" | "VOTE" | "STAKE" | "REWARD";

export type TransactionStatus = "PENDING" | "CONFIRMED" | "REJECTED";

export interface Wallet {
  address: string;
  publicKey: string;
  label?: string | null;
  createdAt: string;
}

export interface UnsignedTransactionPayload {
  type: TransactionType;
  fromAddress: string | null;
  toAddress: string | null;
  amount: number;
  payload: Record<string, unknown>;
  nonce: number;
  timestamp: string;
}

export interface Transaction extends UnsignedTransactionPayload {
  id: string;
  hash: string;
  signature: string | null;
  publicKey: string | null;
  status: TransactionStatus;
  blockHash?: string | null;
  rejectionReason?: string | null;
  confirmedAt?: string | null;
  createdAt: string;
}

export interface Block {
  hash: string;
  height: number;
  previousHash: string;
  timestamp: string;
  merkleRoot: string;
  nonce: number;
  difficulty: number;
  consensus: ConsensusName;
  validatorAddress?: string | null;
  metadata: Record<string, unknown>;
  transactions: Transaction[];
  createdAt: string;
}

export interface BlockRecord {
  hash: string;
  height: number;
  previousHash: string;
  timestamp: string;
  merkleRoot: string;
  nonce: number;
  difficulty: number;
  consensus: ConsensusName;
  validatorAddress?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ValidatorNode {
  address: string;
  publicKey: string;
  stake: number;
  status: "ACTIVE" | "INACTIVE" | "JAILED";
  nodeUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkNode {
  id: string;
  url: string;
  publicKey?: string | null;
  status: "ACTIVE" | "INACTIVE";
  metadata: Record<string, unknown>;
  lastSeenAt: string;
  createdAt: string;
}

export interface ConsensusEvent {
  id: string;
  blockHash: string;
  height: number;
  algorithm: ConsensusName;
  phase: string;
  validatorAddress?: string | null;
  signature?: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface ChainValidationResult {
  valid: boolean;
  errors: string[];
}

