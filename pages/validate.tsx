import React, { useState } from "react";
import Button from "../components/Button";
import Input from "../components/Input";
import { toast } from "react-hot-toast";
import Spinner from "../components/Spinner";
import { VerifyVote } from "../libs/API";
import Modal from "../components/Modal";
import Navbar from "../components/Navbar";
import Link from "next/link";

const Validate = () => {
  const [transactionKey, setTransactionKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const validateVote = async (event: any) => {
    event.preventDefault();
    if (!transactionKey.trim()) {
      toast("Please enter the transaction key", { style: { background: "#222", color: "#fff" } });
      return;
    }
    try {
      setLoading(true);
      const data = await VerifyVote(transactionKey.trim());
      setResult(data);
      setModalOpen(true);
      if (data?.valid) {
        toast.success("Vote verified on blockchain!", { style: { background: "#111", color: "#00E676" } });
      } else {
        toast.error("Vote not found.", { style: { background: "#222", color: "#FF1A1A" } });
      }
    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <div className="max-w-2xl mx-auto flex flex-col gap-8 py-8">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-3xl mx-auto mb-4">🔍</div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
              Verify Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Vote</span>
            </h1>
            <p className="text-muted mt-3 text-sm leading-relaxed max-w-md mx-auto">
              Enter the unique Transaction Key you received after casting your vote to verify it exists and is valid on the blockchain.
            </p>
          </div>

          {/* Form */}
          <div className="glass-card p-6 md:p-8 flex flex-col gap-5">
            <form onSubmit={validateVote} className="flex flex-col gap-5">
              <Input
                label="Transaction Key"
                type="text"
                placeholder="e.g. TX-194A7B2F-ABCDEF123456"
                value={transactionKey}
                onChange={(e) => setTransactionKey(e.target.value)}
              />
              <Button onClick={validateVote} className="w-full">
                {loading ? <Spinner /> : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                    Verify Vote on Blockchain
                  </>
                )}
              </Button>
            </form>

            <div className="border-t border-border/50 pt-4">
              <p className="text-xs text-muted text-center">
                Don't have a key?{" "}
                <Link href="/dashboard" className="text-primary hover:text-accent transition-colors">
                  Go cast your vote first →
                </Link>
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className="glass-card p-6 flex flex-col gap-4">
            <h3 className="font-display font-semibold text-white text-sm">How Vote Verification Works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: "🗳️", title: "Cast Vote", desc: "A unique SHA-256 transaction hash is generated from your vote" },
                { icon: "⛓️", title: "On-Chain Record", desc: "Your encrypted vote is stored permanently on the blockchain ledger" },
                { icon: "🔍", title: "Verify Anytime", desc: "Use this page to verify your vote still exists and is valid" },
              ].map((item) => (
                <div key={item.title} className="flex flex-col gap-2 text-center">
                  <div className="text-2xl mx-auto">{item.icon}</div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Result Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setResult(null); setTransactionKey(""); }}
        title={result?.valid ? "Vote Verified ✅" : "Vote Not Found ❌"}
      >
        {result?.valid ? (
          <div className="flex flex-col gap-4">
            <div className="bg-success/10 border border-success/20 rounded-xl p-4 text-center">
              <p className="text-success font-semibold text-lg">Your vote is valid and on-chain!</p>
            </div>
            {result?.vote && (
              <div className="flex flex-col gap-3">
                {[
                  { label: "Election", value: result.vote.election },
                  { label: "Candidate", value: result.vote.candidate },
                  { label: "Timestamp", value: new Date(result.vote.timestamp).toLocaleString() },
                  { label: "Transaction Key", value: result.vote.transactionKey },
                ].map((row) => row.value && (
                  <div key={row.label} className="bg-background/60 rounded-xl p-3 border border-border/40">
                    <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">{row.label}</p>
                    <p className="text-sm text-white font-mono break-all">{row.value}</p>
                  </div>
                ))}
              </div>
            )}
            <Button onClick={() => { setModalOpen(false); setResult(null); setTransactionKey(""); }} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center text-3xl">❌</div>
            <div>
              <p className="font-display font-semibold text-white text-lg">No Vote Found</p>
              <p className="text-sm text-muted mt-2">
                The provided transaction key does not match any recorded vote. Please double-check your key.
              </p>
            </div>
            <Button onClick={() => { setModalOpen(false); setResult(null); }} className="w-full mt-2">Try Again</Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Validate;
