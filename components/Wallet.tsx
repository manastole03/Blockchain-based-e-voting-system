import React, { useCallback, useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { WalletState, authState } from "../atoms";
import { GetVoterWallet } from "../libs/API";
import { toast } from "react-hot-toast";
import Spinner from "./Spinner";

const Wallet: React.FC<{}> = () => {
  const [loading, setLoading] = useState(false);
  const auth = useRecoilValue(authState);
  const [wallet, setWallet] = useRecoilState(WalletState);

  const getWallet = useCallback(async () => {
    try {
      setLoading(true);
      const data = await GetVoterWallet(auth?.token);
      const W = data?.wallet;
      if (W) {
        setWallet({ public_key: W?.public_key, tokens: W?.tokens });
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Failed to fetch wallet.", { style: { background: "#111", color: "#fff" } });
    } finally {
      setLoading(false);
    }
  }, [auth?.token, setWallet]);

  useEffect(() => { getWallet(); }, [getWallet]);

  const hasTokens = wallet?.tokens > 0;
  const shortKey = wallet?.public_key
    ? `${wallet.public_key.slice(0, 6)}...${wallet.public_key.slice(-6)}`
    : "–";

  return (
    <div className="w-80 flex-shrink-0 flex flex-col gap-4">
      {/* Voter Wallet Card */}
      <div className="glass-card p-5 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B38FB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 100 4 2 2 0 000-4z"/>
              </svg>
            </div>
            <span className="font-display font-semibold text-white text-sm">Voter Wallet</span>
          </div>
          <button
            onClick={getWallet}
            className="w-7 h-7 rounded-lg border border-border/50 flex items-center justify-center text-muted hover:text-white hover:border-primary/50 transition-all duration-200"
            title="Refresh wallet"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
          </button>
        </div>

        {/* Address */}
        <div className="bg-background/60 rounded-xl px-4 py-3 border border-border/40">
          <p className="text-xs text-muted mb-1 uppercase tracking-wider font-medium">Wallet Address</p>
          <p className="text-sm text-white font-mono">{shortKey}</p>
        </div>

        {/* Token balance */}
        <div className="flex flex-col items-center justify-center py-4 gap-2">
          {loading ? (
            <Spinner />
          ) : (
            <>
              <div className={`text-7xl font-display font-black ${hasTokens ? "text-primary" : "text-muted"}`}>
                {wallet?.tokens}
              </div>
              <div className="text-sm text-muted font-medium">
                Vote Token{wallet?.tokens !== 1 ? "s" : ""} Available
              </div>
            </>
          )}
        </div>

        {/* Status indicator */}
        <div className={`rounded-xl p-3 flex items-center gap-3 ${hasTokens ? "bg-success/10 border border-success/20" : "bg-error/10 border border-error/20"}`}>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${hasTokens ? "bg-success/20" : "bg-error/20"}`}>
            {hasTokens ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
          </div>
          <div>
            <p className={`text-xs font-semibold ${hasTokens ? "text-success" : "text-error"}`}>
              {hasTokens ? "Eligible to Vote" : "No Tokens Left"}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {hasTokens ? "Your vote can still be cast" : "You've used all your vote tokens"}
            </p>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="glass-card p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">How Voting Works</p>
        {[
          { icon: "1", text: "Select an election below" },
          { icon: "2", text: "Review your candidate choices" },
          { icon: "3", text: "Confirm your vote — it's immutable" },
          { icon: "4", text: "Save your transaction key for audit" },
        ].map((step) => (
          <div key={step.icon} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
              {step.icon}
            </div>
            <p className="text-xs text-muted">{step.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Wallet;
