import type { ConsensusName } from "../../models/blockchain.types";
import type { ConsensusEngine } from "./consensus.interface";
import { PbftConsensus } from "./pbft";
import { ProofOfStakeConsensus } from "./proof-of-stake";
import { ProofOfWorkConsensus } from "./proof-of-work";

export function createConsensusEngine(name: ConsensusName): ConsensusEngine {
  switch (name) {
    case "pow":
      return new ProofOfWorkConsensus();
    case "pos":
      return new ProofOfStakeConsensus();
    case "pbft":
      return new PbftConsensus();
    default:
      return exhaustive(name);
  }
}

function exhaustive(value: never): never {
  throw new Error(`Unsupported consensus algorithm: ${value}`);
}

