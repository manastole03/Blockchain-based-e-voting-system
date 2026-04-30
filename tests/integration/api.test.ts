import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { InMemoryBlockchainRepository } from "../../src/repositories/in-memory.repository";
import { testConfig } from "../helpers";

describe("Blockchain API", () => {
  it("creates wallets, submits a signed transaction, mines a block, and validates the chain", async () => {
    const repository = new InMemoryBlockchainRepository();
    const { app } = await createApp({
      repository,
      config: testConfig,
      initializeChain: true,
    });

    const voterResponse = await request(app).post("/api/wallets").send({ label: "voter" });
    const minerResponse = await request(app).post("/api/wallets").send({ label: "miner" });

    expect(voterResponse.status).toBe(201);
    expect(minerResponse.status).toBe(201);

    const voter = voterResponse.body.data;
    const miner = minerResponse.body.data;

    const signResponse = await request(app)
      .post("/api/transactions/sign")
      .send({
        type: "VOTE",
        fromAddress: voter.address,
        amount: 0,
        payload: {
          electionId: "student-council",
          candidateId: "candidate-1",
        },
        privateKey: voter.privateKey,
      });

    expect(signResponse.status).toBe(200);

    const signed = signResponse.body.data;
    const transactionResponse = await request(app)
      .post("/api/transactions")
      .send({
        ...signed.signingPayload,
        signature: signed.signature,
        publicKey: signed.publicKey,
      });

    expect(transactionResponse.status).toBe(201);

    const pendingResponse = await request(app).get("/api/transactions/pending");
    expect(pendingResponse.body.data.transactions).toHaveLength(1);

    const minedResponse = await request(app)
      .post("/api/blocks/mine")
      .send({ minerAddress: miner.address });

    expect(minedResponse.status).toBe(201);
    expect(minedResponse.body.data.height).toBe(1);

    const validationResponse = await request(app).get("/api/blockchain/validate");
    expect(validationResponse.status).toBe(200);
    expect(validationResponse.body.data.valid).toBe(true);
  });
});

