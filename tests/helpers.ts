import type { EnvConfig } from "../src/config/env";
import type { WalletService } from "../src/services/wallet.service";

export const testConfig: EnvConfig = {
  NODE_ENV: "test",
  PORT: 4000,
  API_PREFIX: "/api",
  DATABASE_URL: "postgres://test:test@localhost:5432/test",
  CORS_ORIGIN: "*",
  LOG_LEVEL: "silent",
  CONSENSUS_ALGORITHM: "pow",
  POW_DIFFICULTY: 1,
  MINING_REWARD: 5,
  MAX_TRANSACTIONS_PER_BLOCK: 100,
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_MAX: 10_000,
  AUTO_MIGRATE: false,
};

export async function createWallet(walletService: WalletService, label?: string) {
  return walletService.createWallet(label);
}

