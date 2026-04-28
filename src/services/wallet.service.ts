import type { Wallet } from "../models/blockchain.types";
import type { BlockchainRepository } from "../repositories/blockchain.repository";
import { AppError } from "../utils/app-error";
import { generateWalletKeys } from "../utils/crypto";

export interface CreatedWallet {
  address: string;
  publicKey: string;
  privateKey: string;
  label?: string | null;
  warning: string;
}

export class WalletService {
  constructor(private readonly repository: BlockchainRepository) {}

  async createWallet(label?: string | null): Promise<CreatedWallet> {
    const keys = generateWalletKeys();
    const wallet: Wallet = {
      address: keys.address,
      publicKey: keys.publicKey,
      label: label ?? null,
      createdAt: new Date().toISOString(),
    };

    await this.repository.createWallet(wallet);

    return {
      ...keys,
      label: wallet.label,
      warning:
        "Private key is returned once for client-side signing. The server stores only the public key.",
    };
  }

  async getBalance(address: string) {
    const wallet = await this.repository.getWallet(address);

    if (!wallet) {
      throw new AppError(404, "WALLET_NOT_FOUND", "Wallet was not found");
    }

    return {
      address,
      ...(await this.repository.getBalance(address)),
    };
  }
}

