import { randomUUID } from "crypto";
import type { Block, ConsensusEvent, ValidatorNode } from "../../models/blockchain.types";
import type { BlockchainRepository } from "../../repositories/blockchain.repository";
import { AppError } from "../../utils/app-error";
import { calculateBlockHash } from "../../utils/block-hash";
import { sha256 } from "../../utils/hash";
import type { BuildBlockInput, BuiltBlock, ConsensusEngine } from "./consensus.interface";

export class PbftConsensus implements ConsensusEngine {
  readonly name = "pbft" as const;

  async buildBlock(
    input: BuildBlockInput,
    repository: BlockchainRepository
  ): Promise<BuiltBlock> {
    const validators = await repository.listActiveValidators();

    if (validators.length < 4) {
      throw new AppError(
        409,
        "INSUFFICIENT_PBFT_VALIDATORS",
        "PBFT requires at least four active validators to tolerate one Byzantine fault"
      );
    }

    const proposer = this.selectProposer(validators, input.height);
    const now = new Date().toISOString();
    const candidate: Block = {
      hash: "",
      height: input.height,
      previousHash: input.previousHash,
      timestamp: input.timestamp,
      merkleRoot: input.merkleRoot,
      nonce: 0,
      difficulty: 0,
      consensus: this.name,
      validatorAddress: proposer.address,
      metadata: {
        view: input.height,
        proposer: proposer.address,
        quorum: this.quorum(validators.length),
        validatorCount: validators.length,
      },
      transactions: input.transactions,
      createdAt: now,
    };
    const hash = calculateBlockHash(candidate);
    const quorumValidators = validators.slice(0, this.quorum(validators.length));
    const events = this.createQuorumEvents(hash, input.height, quorumValidators, now);

    return {
      block: {
        ...candidate,
        hash,
      },
      events,
    };
  }

  async validateBlock(block: Block, repository: BlockchainRepository): Promise<void> {
    if (block.consensus !== this.name) {
      throw new AppError(422, "CONSENSUS_MISMATCH", "Block was not created with PBFT");
    }

    const validators = await repository.listActiveValidators();
    const quorum = this.quorum(validators.length);
    const events = await repository.getConsensusEvents(block.hash);
    const commits = events.filter((event) => event.phase === "commit");
    const uniqueCommitters = new Set(commits.map((event) => event.validatorAddress));

    if (validators.length < 4) {
      throw new AppError(422, "INSUFFICIENT_PBFT_VALIDATORS", "PBFT validation needs four validators");
    }

    if (uniqueCommitters.size < quorum) {
      throw new AppError(422, "PBFT_QUORUM_NOT_REACHED", "Block does not have enough PBFT commits");
    }
  }

  private createQuorumEvents(
    blockHash: string,
    height: number,
    validators: ValidatorNode[],
    timestamp: string
  ): ConsensusEvent[] {
    return validators.flatMap((validator) => [
      {
        id: randomUUID(),
        blockHash,
        height,
        algorithm: this.name,
        phase: "prepare",
        validatorAddress: validator.address,
        signature: sha256(`${validator.address}:${blockHash}:prepare`),
        payload: { message: "PREPARE" },
        createdAt: timestamp,
      },
      {
        id: randomUUID(),
        blockHash,
        height,
        algorithm: this.name,
        phase: "commit",
        validatorAddress: validator.address,
        signature: sha256(`${validator.address}:${blockHash}:commit`),
        payload: { message: "COMMIT" },
        createdAt: timestamp,
      },
    ]);
  }

  private quorum(validatorCount: number): number {
    return Math.floor((2 * validatorCount) / 3) + 1;
  }

  private selectProposer(validators: ValidatorNode[], height: number): ValidatorNode {
    return validators[height % validators.length];
  }
}

