import { z } from "zod";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address");
const publicKeySchema = z.string().min(50);
const privateKeySchema = z.string().min(50);

export const walletCreateSchema = z.object({
  label: z.string().max(120).optional(),
});

export const addressParamsSchema = z.object({
  address: addressSchema,
});

export const transactionTypeSchema = z.enum(["TRANSFER", "VOTE", "STAKE"]);

export const unsignedTransactionSchema = z.object({
  type: transactionTypeSchema,
  fromAddress: addressSchema.nullish(),
  toAddress: addressSchema.nullish(),
  amount: z.coerce.number().min(0).default(0),
  payload: z.record(z.string(), z.unknown()).default({}),
  nonce: z.coerce.number().int().positive().optional(),
  timestamp: z.string().datetime().optional(),
});

export const signTransactionSchema = unsignedTransactionSchema.extend({
  privateKey: privateKeySchema,
});

export const createTransactionSchema = unsignedTransactionSchema.extend({
  fromAddress: addressSchema,
  signature: z.string().min(32),
  publicKey: publicKeySchema,
});

export const validateTransactionSchema = z.union([
  z.object({
    hash: z.string().length(64),
  }),
  createTransactionSchema,
]);

export const mineBlockSchema = z.object({
  minerAddress: addressSchema.optional(),
});

export const blockIdentifierParamsSchema = z.object({
  identifier: z.string().min(1),
});

export const registerNodeSchema = z.object({
  url: z.string().url(),
  publicKey: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const registerValidatorSchema = z.object({
  address: addressSchema,
  publicKey: publicKeySchema,
  stake: z.coerce.number().int().positive(),
  nodeUrl: z.string().url().optional(),
});
