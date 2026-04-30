import { randomUUID } from "crypto";
import type { NetworkNode } from "../models/blockchain.types";
import type { BlockchainRepository } from "../repositories/blockchain.repository";

export class NodeService {
  constructor(private readonly repository: BlockchainRepository) {}

  async register(input: {
    url: string;
    publicKey?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<NetworkNode> {
    const now = new Date().toISOString();
    return this.repository.registerNode({
      id: randomUUID(),
      url: input.url,
      publicKey: input.publicKey ?? null,
      status: "ACTIVE",
      metadata: input.metadata ?? {},
      lastSeenAt: now,
      createdAt: now,
    });
  }

  async list(): Promise<NetworkNode[]> {
    return this.repository.listNodes();
  }
}

