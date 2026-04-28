import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default("/api"),
  DATABASE_URL: z
    .string()
    .default("postgres://evoting:evoting_password@localhost:5432/evoting"),
  CORS_ORIGIN: z.string().default("*"),
  LOG_LEVEL: z.string().default("info"),
  CONSENSUS_ALGORITHM: z.enum(["pow", "pos", "pbft"]).default("pow"),
  POW_DIFFICULTY: z.coerce.number().int().min(1).max(6).default(3),
  MINING_REWARD: z.coerce.number().min(0).default(10),
  MAX_TRANSACTIONS_PER_BLOCK: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AUTO_MIGRATE: z
    .preprocess((value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      return value;
    }, z.boolean())
    .default(false),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
