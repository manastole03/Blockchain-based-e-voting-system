import { describe, expect, it } from "vitest";
import { InMemoryBlockchainRepository } from "../../src/repositories/in-memory.repository";
import { TransactionService } from "../../src/services/transaction.service";
import { WalletService } from "../../src/services/wallet.service";

describe("TransactionService", () => {
  it("signs and verifies a vote transaction", async () => {
    const repository = new InMemoryBlockchainRepository();
    const walletService = new WalletService(repository);
    const transactionService = new TransactionService(repository);
    const wallet = await walletService.createWallet("voter");
    const unsigned = transactionService.buildUnsignedPayload({
      type: "VOTE",
      fromAddress: wallet.address,
      amount: 0,
      payload: {
        electionId: "election-2026",
        candidateId: "candidate-1",
      },
    });

    const signed = transactionService.sign(unsigned, wallet.privateKey);
    const validation = await transactionService.validateInput({
      ...signed.signingPayload,
      signature: signed.signature,
      publicKey: signed.publicKey,
    });

    expect(validation.valid).toBe(true);
    expect(validation.transactionHash).toBe(signed.transactionHash);
  });

  it("rejects a tampered signature payload", async () => {
    const repository = new InMemoryBlockchainRepository();
    const walletService = new WalletService(repository);
    const transactionService = new TransactionService(repository);
    const wallet = await walletService.createWallet("voter");
    const unsigned = transactionService.buildUnsignedPayload({
      type: "VOTE",
      fromAddress: wallet.address,
      amount: 0,
      payload: {
        electionId: "election-2026",
        candidateId: "candidate-1",
      },
    });
    const signed = transactionService.sign(unsigned, wallet.privateKey);

    const validation = await transactionService.validateInput({
      ...signed.signingPayload,
      payload: {
        electionId: "election-2026",
        candidateId: "candidate-2",
      },
      signature: signed.signature,
      publicKey: signed.publicKey,
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("Invalid transaction signature");
  });
});

