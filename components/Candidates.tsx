import { useRouter } from "next/router";
import CandidateCard, { Candidate } from "./CandidateCard";
import { useState } from "react";
import Modal from "./Modal";
import Button, { OutlinedButton } from "./Button";
import { CastVote } from "../libs/API";
import { useRecoilState, useRecoilValue } from "recoil";
import { WalletState, authState } from "../atoms";
import { toast } from "react-hot-toast";
import Spinner from "./Spinner";

interface Props {
  candidates: Candidate[];
  electionName?: string;
}

const Candidates: React.FC<Props> = ({ candidates, electionName }) => {
  const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = useRecoilValue(authState);
  const [wallet, setWallet] = useRecoilState(WalletState);

  const [modalOpen, setModalOpen] = useState(false);
  const [noTokenModal, setNoTokenModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [transactionKey, setTransactionKey] = useState("");
  const [signature, setSignature] = useState("");

  const handleVoteConfirm = (candidate: Candidate) => {
    if (wallet?.tokens <= 0) {
      setNoTokenModal(true);
    } else {
      setCurrentCandidate(candidate);
      setModalOpen(true);
    }
  };

  const confirmVote = async () => {
    try {
      setLoading(true);
      const { id } = router.query;
      const electionId = Array.isArray(id) ? id[0] : id;
      const candidateId = currentCandidate?._id || currentCandidate?.id;

      if (!electionId || !candidateId) throw new Error("Missing vote target.");

      const data = await CastVote(auth.token, electionId, candidateId);
      setWallet((w) => ({ ...w, tokens: Math.max(0, w.tokens - 1) }));
      setCurrentCandidate(null);
      setTransactionKey(data?.TransactionKey);
      setSignature(data?.SignatureGenerated);
      setModalOpen(false);
      setSuccessModal(true);

      toast.success("Vote cast successfully on the blockchain!", {
        style: { background: "#111", color: "#00E676" },
      });
    } catch {
      toast.error("Voting failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!", { style: { background: "#111", color: "#fff" } });
  };

  return (
    <div className="flex-1 flex flex-col gap-6 min-h-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-white">
            {electionName || "Election Candidates"}
          </h2>
          <p className="text-sm text-muted mt-1">
            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} - Choose wisely, your vote is permanent
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
          <span className="text-xs font-medium text-primary">{wallet.tokens} vote{wallet.tokens !== 1 ? "s" : ""} left</span>
        </div>
      </div>

      {candidates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate?.id}
              candidate={candidate}
              onClick={() => handleVoteConfirm(candidate)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card p-16 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-4xl">No Candidates Yet</p>
          <p className="text-sm text-muted">Candidates have not been registered for this election.</p>
        </div>
      )}

      <div className="glass-card p-4 flex items-start gap-3 border-l border-l-accent/50">
        <div className="text-accent text-xl mt-0.5">Chain</div>
        <div>
          <p className="text-sm font-semibold text-white">Blockchain Secured</p>
          <p className="text-xs text-muted mt-1">
            Your vote is cryptographically signed using SHA-256 HMAC and recorded as an immutable transaction on the blockchain. Once cast, it cannot be altered or deleted.
          </p>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Confirm Your Vote">
        <div className="flex flex-col gap-5">
          <div className="text-center py-4">
            <p className="text-muted text-sm">You are about to cast an immutable vote for</p>
            <p className="text-2xl font-display font-bold text-white mt-2">
              {currentCandidate?.name}
            </p>
            {currentCandidate?.party && (
              <span className="inline-block mt-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-medium">
                {currentCandidate.party}
              </span>
            )}
          </div>
          <div className="bg-error/10 border border-error/20 rounded-xl p-3 text-xs text-error flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            This action is irreversible. Your vote will be permanently recorded.
          </div>
          <div className="flex gap-3 pt-2">
            <OutlinedButton onClick={() => setModalOpen(false)} className="flex-1">Cancel</OutlinedButton>
            <Button onClick={confirmVote} className="flex-1">
              {loading ? <Spinner /> : "Confirm Vote"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={noTokenModal} onClose={() => setNoTokenModal(false)} title="No Tokens Available">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div>
            <p className="font-display font-semibold text-white text-lg">All Tokens Used</p>
            <p className="text-sm text-muted mt-2">
              You have used all of your vote tokens. Each voter gets one token per election.
            </p>
          </div>
          <OutlinedButton onClick={() => setNoTokenModal(false)} className="w-full mt-2">Understood</OutlinedButton>
        </div>
      </Modal>

      <Modal isOpen={successModal} onClose={() => setSuccessModal(false)} title="Vote Recorded on Blockchain">
        <div className="flex flex-col gap-5">
          <div className="text-center py-2">
            <p className="font-display font-bold text-white text-xl">Vote Cast Successfully!</p>
            <p className="text-sm text-muted mt-1">Your vote has been cryptographically sealed and recorded.</p>
          </div>

          <div className="bg-background/60 rounded-xl p-4 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted uppercase tracking-wider font-semibold">Transaction Key</p>
              <button
                onClick={() => copyToClipboard(transactionKey)}
                className="text-xs text-primary hover:text-accent transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="font-mono text-sm text-accent break-all">{transactionKey}</p>
          </div>

          <div className="bg-background/60 rounded-xl p-4 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted uppercase tracking-wider font-semibold">Cryptographic Signature</p>
              <button
                onClick={() => copyToClipboard(signature)}
                className="text-xs text-primary hover:text-accent transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="font-mono text-xs text-muted break-all">{signature}</p>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-xs text-primary flex items-start gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            Save your Transaction Key. Use it on the Verify Vote page to audit your vote at any time.
          </div>

          <Button onClick={() => setSuccessModal(false)} className="w-full">Done</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Candidates;
