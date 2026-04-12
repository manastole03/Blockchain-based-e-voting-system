import { atom } from "recoil";

export interface AuthState {
  name: string;
  email: string;
  id: string;
  isLoggedIn: boolean;
  token: string;
  locationId: string | "";
}

export const authState = atom<AuthState>({
  key: "authState",
  default: {
    name: "",
    email: "",
    id: "",
    token: "",
    isLoggedIn: false,
    locationId: "",
  },
});

export interface WalletState {
  public_key: string;
  tokens: number;
}

export const WalletState = atom<WalletState>({
  key: "waleltState",
  default: {
    public_key: "",
    tokens: 0,
  },
});

export interface CandidateState {
  name: string;
  public_key: string;
  tokens: number;
  location: string;
}
interface Candidates {
  candidates: CandidateState[];
}
export const CandidateWalletsState = atom<Candidates>({
  key: "candidateWallets",
  default: {
    candidates: [],
  },
});
