import { describe, expect, it } from "vitest";
import { InMemoryBlockchainRepository } from "../../src/repositories/in-memory.repository";
import { BlockchainService } from "../../src/services/blockchain.service";
import { TransactionService } from "../../src/services/transaction.service";
import { ValidatorService } from "../../src/services/validator.service";
import { WalletService } from "../../src/services/wallet.service";
import { testConfig } from "../helpers";

describe("Consensus engines", () => {
  it("creates a proof-of-stake block with an active validator", async () => {
    const repository = new InMemoryBlockchainRepository();
    const walletService = new WalletService(repository);
    const transactionService = new TransactionService(repository);
    const validatorService = new ValidatorService(repository);
    const validator = await walletService.createWallet("validator");
    await validatorService.register({
      address: validator.address,
      publicKey: validator.publicKey,
      stake: 100,
    });

    const blockchainService = new BlockchainService(repository, transactionService, {
      ...testConfig,
      CONSENSUS_ALGORITHM: "pos",
      MINING_REWARD: 5,
    });

    await blockchainService.initialize();
    const block = await blockchainService.mineBlock(validator.address);
    const validation = await blockchainService.validateChain();

    expect(block.consensus).toBe("pos");
    expect(block.validatorAddress).toBe(validator.address);
    expect(validation.valid).toBe(true);
  });

  it("creates a PBFT block after reaching quorum", async () => {
    const repository = new InMemoryBlockchainRepository();
    const walletService = new WalletService(repository);
    const transactionService = new TransactionService(repository);
    const validatorService = new ValidatorService(repository);

    for (let index = 0; index < 4; index += 1) {
      const validator = await walletService.createWallet(`validator-${index}`);
      await validatorService.register({
        address: validator.address,
        publicKey: validator.publicKey,
        stake: 100,
      });
    }

    const miner = await walletService.createWallet("miner");
    const blockchainService = new BlockchainService(repository, transactionService, {
      ...testConfig,
      CONSENSUS_ALGORITHM: "pbft",
      MINING_REWARD: 5,
    });

    await blockchainService.initialize();
    const block = await blockchainService.mineBlock(miner.address);
    const validation = await blockchainService.validateChain();

    expect(block.consensus).toBe("pbft");
    expect(validation.valid).toBe(true);
  });
});

