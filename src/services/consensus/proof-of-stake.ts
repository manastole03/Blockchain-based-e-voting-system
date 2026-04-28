import { randomUUID } from "crypto";
import type { Block, ConsensusEvent, ValidatorNode } from "../../models/blockchain.types";
import type { BlockchainRepository } from "../../repositories/blockchain.repository";
import { AppError } from "../../utils/app-error";
import { calculateBlockHash } from "../../utils/block-hash";
import { sha256 } from "../../utils/hash";
import type { BuildBlockInput, BuiltBlock, ConsensusEngine } from "./consensus.interface";

export class ProofOfStakeConsensus implements ConsensusEngine {
  readonly name = "pos" as const;

  async buildBlock(
    input: BuildBlockInput,
    repository: BlockchainRepository
  ): Promise<BuiltBlock> {
    const validators = await repository.listActiveValidators();

    if (validators.length === 0) {
      throw new AppError(
        409,
        "NO_ACTIVE_VALIDATORS",
        "Proof of Stake requires at least one active validator"
      );
    }

    const selected = this.selectValidator(validators, input.previousHash, input.height);
    const requested = validators.find((validator) => validator.address === input.minerAddress);
    const validator = requested ?? selected;
    const now = new Date().toISOString();
    const totalStake = validators.reduce((total, item) => total + item.stake, 0);

    const candidate: Block = {
      hash: "",
      height: input.height,
      previousHash: input.previousHash,
      timestamp: input.timestamp,
      merkleRoot: input.merkleRoot,
      nonce: 0,
      difficulty: 0,
      consensus: this.name,
      validatorAddress: validator.address,
      metadata: {
        selectedValidator: selected.address,
        totalStake,
        selectionSeed: sha256(`${input.previousHash}:${input.height}`),
      },
      transactions: input.transactions,
      createdAt: now,
    };
    const hash = calculateBlockHash(candidate);

    return {
      block: {
        ...candidate,
        hash,
      },
      events: [
        {
          id: randomUUID(),
          blockHash: hash,
          height: input.height,
          algorithm: this.name,
          phase: "proposed",
          validatorAddress: validator.address,
          signature: sha256(`${validator.address}:${hash}:pos`),
          payload: { stake: validator.stake, totalStake },
          createdAt: now,
        },
      ],
    };
  }

  async validateBlock(block: Block, repository: BlockchainRepository): Promise<void> {
    if (block.consensus !== this.name) {
      throw new AppError(422, "CONSENSUS_MISMATCH", "Block was not created with Proof of Stake");
    }

    if (!block.validatorAddress) {
      throw new AppError(422, "MISSING_VALIDATOR", "Proof of Stake block requires a validator");
    }

    const validator = await repository.getValidator(block.validatorAddress);

    if (!validator || validator.status !== "ACTIVE" || validator.stake <= 0) {
      throw new AppError(422, "INVALID_VALIDATOR", "Block validator is not active or has no stake");
    }
  }

  private selectValidator(
    validators: ValidatorNode[],
    previousHash: string,
    height: number
  ): ValidatorNode {
    const totalStake = validators.reduce((total, validator) => total + validator.stake, 0);
    const seed = BigInt(`0x${sha256(`${previousHash}:${height}`).slice(0, 16)}`);
    let cursor = Number(seed % BigInt(Math.max(totalStake, 1)));

    for (const validator of validators) {
      cursor -= validator.stake;
      if (cursor < 0) {
        return validator;
      }
    }

    return validators[0];
  }
}

