import { describe, expect, it } from "vitest";
import { InMemoryBlockchainRepository } from "../../src/repositories/in-memory.repository";
import { BlockchainService } from "../../src/services/blockchain.service";
import { TransactionService } from "../../src/services/transaction.service";
import { WalletService } from "../../src/services/wallet.service";
import { testConfig } from "../helpers";

describe("BlockchainService", () => {
  it("creates a genesis block and validates the chain", async () => {
    const repository = new InMemoryBlockchainRepository();
    const transactionService = new TransactionService(repository);
    const blockchainService = new BlockchainService(repository, transactionService, testConfig);

    const genesis = await blockchainService.initialize();
    const validation = await blockchainService.validateChain();

    expect(genesis.height).toBe(0);
    expect(validation.valid).toBe(true);
  });

  it("mines a signed vote transaction into a proof-of-work block", async () => {
    const repository = new InMemoryBlockchainRepository();
    const walletService = new WalletService(repository);
    const transactionService = new TransactionService(repository);
    const blockchainService = new BlockchainService(repository, transactionService, testConfig);
    const voter = await walletService.createWallet("voter");
    const miner = await walletService.createWallet("miner");
    const unsigned = transactionService.buildUnsignedPayload({
      type: "VOTE",
      fromAddress: voter.address,
      payload: {
        electionId: "election-2026",
        candidateId: "candidate-1",
      },
    });
    const signed = transactionService.sign(unsigned, voter.privateKey);

    await transactionService.create({
      ...signed.signingPayload,
      signature: signed.signature,
      publicKey: signed.publicKey,
    });

    const block = await blockchainService.mineBlock(miner.address);
    const validation = await blockchainService.validateChain();

    expect(block.height).toBe(1);
    expect(block.transactions.map((transaction) => transaction.type)).toContain("VOTE");
    expect(block.hash.startsWith("0")).toBe(true);
    expect(validation.valid).toBe(true);
  });
});

