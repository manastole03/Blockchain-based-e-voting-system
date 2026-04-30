import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { TextDecoder } from "util";

const utf8Decoder = new TextDecoder();

export type FabricVoteInput = {
  voterId: string;
  electionId: string;
  candidateId: string;
  transactionKey: string;
  transactionHash: string;
  signature: string;
  commitment: string;
  timestamp: string;
};

export type FabricVoteRecord = {
  docType: "vote";
  version: number;
  transactionKey: string;
  transactionHash: string;
  electionId: string;
  candidateId: string;
  voterHash: string;
  voterCommitment: string | null;
  signature: string;
  commitment: string;
  clientTimestamp: string | null;
  fabricTxId: string;
  fabricTimestamp: string;
};

export type FabricVoteSubmission = {
  enabled: true;
  channelName: string;
  chaincodeName: string;
  contractName: string;
  record: FabricVoteRecord;
};

type FabricConfig = {
  channelName: string;
  chaincodeName: string;
  contractName: string;
  mspId: string;
  peerEndpoint: string;
  peerHostAlias?: string;
  tlsCertPath: string;
  certPath: string;
  keyPath?: string;
  keyDirectory?: string;
};

type FabricSession = {
  contract: any;
  gateway: {
    close: () => void;
  };
  client: {
    close: () => void;
  };
  config: FabricConfig;
};

export function isFabricEnabled(): boolean {
  return ["1", "true", "yes"].includes(String(process.env.FABRIC_ENABLED ?? "").toLowerCase());
}

export function getFabricRuntimeStatus() {
  if (!isFabricEnabled()) {
    return {
      enabled: false,
      configured: false,
    };
  }

  try {
    const config = getFabricConfig();
    return {
      enabled: true,
      configured: true,
      channelName: config.channelName,
      chaincodeName: config.chaincodeName,
      contractName: config.contractName,
      peerEndpoint: config.peerEndpoint,
      mspId: config.mspId,
    };
  } catch (error: any) {
    return {
      enabled: true,
      configured: false,
      error: error?.message ?? "Fabric Gateway is not configured",
    };
  }
}

export async function submitVoteToFabric(
  input: FabricVoteInput
): Promise<FabricVoteSubmission | null> {
  if (!isFabricEnabled()) {
    return null;
  }

  const session = await connectToFabric();
  const payload = {
    transactionKey: input.transactionKey,
    transactionHash: input.transactionHash,
    electionId: input.electionId,
    candidateId: input.candidateId,
    voterHash: buildVoterHash(input.voterId, input.electionId),
    voterCommitment: buildVoterCommitment(input.voterId, input.electionId, input.transactionKey),
    signature: input.signature,
    commitment: input.commitment,
    timestamp: input.timestamp,
  };

  try {
    const result = await session.contract.submitTransaction("CastVote", JSON.stringify(payload));
    const record = parseFabricResult<FabricVoteRecord>(result);

    return {
      enabled: true,
      channelName: session.config.channelName,
      chaincodeName: session.config.chaincodeName,
      contractName: session.config.contractName,
      record,
    };
  } finally {
    closeSession(session);
  }
}

export async function readVoteFromFabric(
  transactionKey: string
): Promise<FabricVoteRecord | null> {
  if (!isFabricEnabled()) {
    return null;
  }

  const session = await connectToFabric();

  try {
    const result = await session.contract.evaluateTransaction("ReadVote", transactionKey);
    return parseFabricResult<FabricVoteRecord>(result);
  } catch (error: any) {
    if (String(error?.message ?? "").includes("does not exist")) {
      return null;
    }
    throw error;
  } finally {
    closeSession(session);
  }
}

function getFabricConfig(): FabricConfig {
  const config: FabricConfig = {
    channelName: process.env.FABRIC_CHANNEL_NAME ?? "mychannel",
    chaincodeName: process.env.FABRIC_CHAINCODE_NAME ?? "evoting",
    contractName: process.env.FABRIC_CONTRACT_NAME ?? "EVotingContract",
    mspId: process.env.FABRIC_MSP_ID ?? "Org1MSP",
    peerEndpoint: process.env.FABRIC_PEER_ENDPOINT ?? "localhost:7051",
    peerHostAlias: process.env.FABRIC_PEER_HOST_ALIAS,
    tlsCertPath: requireEnv("FABRIC_TLS_CERT_PATH"),
    certPath: requireEnv("FABRIC_CERT_PATH"),
    keyPath: process.env.FABRIC_KEY_PATH,
    keyDirectory: process.env.FABRIC_KEY_DIRECTORY,
  };

  if (!config.keyPath && !config.keyDirectory) {
    throw new Error("Set FABRIC_KEY_PATH or FABRIC_KEY_DIRECTORY for the Fabric identity");
  }

  return config;
}

async function connectToFabric(): Promise<FabricSession> {
  const config = getFabricConfig();
  const grpc = runtimeRequire("@grpc/grpc-js");
  const { connect, hash, signers } = runtimeRequire("@hyperledger/fabric-gateway");
  const tlsRootCert = await fs.readFile(config.tlsCertPath);
  const credentials = await fs.readFile(config.certPath);
  const privateKeyPath = await resolvePrivateKeyPath(config);
  const privateKey = crypto.createPrivateKey(await fs.readFile(privateKeyPath));
  const signer = signers.newPrivateKeySigner(privateKey);
  const grpcOptions = config.peerHostAlias
    ? {
        "grpc.ssl_target_name_override": config.peerHostAlias,
        "grpc.default_authority": config.peerHostAlias,
      }
    : {};
  const client = new grpc.Client(
    config.peerEndpoint,
    grpc.credentials.createSsl(tlsRootCert),
    grpcOptions
  );
  const gateway = connect({
    client,
    identity: {
      mspId: config.mspId,
      credentials,
    },
    signer,
    hash: hash.sha256,
  });
  const network = gateway.getNetwork(config.channelName);
  const contract = network.getContract(config.chaincodeName, config.contractName);

  return {
    contract,
    gateway,
    client,
    config,
  };
}

async function resolvePrivateKeyPath(config: FabricConfig): Promise<string> {
  if (config.keyPath) {
    return config.keyPath;
  }

  const keyDirectory = config.keyDirectory as string;
  const entries = await fs.readdir(keyDirectory);
  const keyFile = entries
    .filter((entry) => !entry.startsWith("."))
    .sort()
    .at(0);

  if (!keyFile) {
    throw new Error(`No private key file found in ${keyDirectory}`);
  }

  return path.join(keyDirectory, keyFile);
}

function closeSession(session: FabricSession): void {
  session.gateway.close();
  session.client.close();
}

function parseFabricResult<T>(result: Uint8Array): T {
  const text = utf8Decoder.decode(result);
  return JSON.parse(text) as T;
}

function runtimeRequire(moduleName: string): any {
  try {
    const dynamicRequire = eval("require") as NodeRequire;
    return dynamicRequire(moduleName);
  } catch (error: any) {
    if (error?.code === "MODULE_NOT_FOUND") {
      throw new Error(
        `Missing Fabric Gateway dependency "${moduleName}". Run npm install before enabling Fabric.`
      );
    }
    throw error;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Set ${name} before enabling Fabric`);
  }
  return value;
}

function buildVoterHash(voterId: string, electionId: string): string {
  const salt = process.env.FABRIC_VOTER_HASH_SALT ?? process.env.CHAIN_SECRET ?? "";
  return crypto.createHash("sha256").update(`${voterId}:${electionId}:${salt}`).digest("hex");
}

function buildVoterCommitment(voterId: string, electionId: string, transactionKey: string): string {
  return crypto
    .createHash("sha256")
    .update(`${voterId}:${electionId}:${transactionKey}`)
    .digest("hex");
}
