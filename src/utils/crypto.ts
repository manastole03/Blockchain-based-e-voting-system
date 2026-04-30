import crypto from "crypto";
import { createHashFromObject, sha256 } from "./hash";
import type { UnsignedTransactionPayload } from "../models/blockchain.types";

export interface GeneratedWalletKeys {
  address: string;
  publicKey: string;
  privateKey: string;
}

export function generateWalletKeys(): GeneratedWalletKeys {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "secp256k1",
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return {
    address: addressFromPublicKey(publicKey),
    publicKey,
    privateKey,
  };
}

export function addressFromPublicKey(publicKey: string): string {
  return `0x${sha256(publicKey).slice(0, 40)}`;
}

export function publicKeyFromPrivateKey(privateKey: string): string {
  return crypto
    .createPublicKey(crypto.createPrivateKey(privateKey))
    .export({ type: "spki", format: "pem" })
    .toString();
}

export function transactionSigningPayload(
  payload: UnsignedTransactionPayload
): UnsignedTransactionPayload {
  return {
    type: payload.type,
    fromAddress: payload.fromAddress,
    toAddress: payload.toAddress,
    amount: payload.amount,
    payload: payload.payload ?? {},
    nonce: payload.nonce,
    timestamp: payload.timestamp,
  };
}

export function hashTransactionPayload(payload: UnsignedTransactionPayload): string {
  return createHashFromObject(transactionSigningPayload(payload));
}

export function signTransactionPayload(
  payload: UnsignedTransactionPayload,
  privateKey: string
): { hash: string; signature: string; publicKey: string; address: string } {
  const normalizedPayload = transactionSigningPayload(payload);
  const hash = hashTransactionPayload(normalizedPayload);
  const signer = crypto.createSign("SHA256");
  signer.update(hash);
  signer.end();

  const publicKey = publicKeyFromPrivateKey(privateKey);

  return {
    hash,
    signature: signer.sign(privateKey, "base64"),
    publicKey,
    address: addressFromPublicKey(publicKey),
  };
}

export function verifyTransactionSignature(params: {
  payload: UnsignedTransactionPayload;
  publicKey: string;
  signature: string;
}): boolean {
  try {
    const verifier = crypto.createVerify("SHA256");
    verifier.update(hashTransactionPayload(params.payload));
    verifier.end();
    return verifier.verify(params.publicKey, params.signature, "base64");
  } catch {
    return false;
  }
}

