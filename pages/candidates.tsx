import { useEffect, useState } from "react";
import { CandidateWalletsState } from "../atoms";
import { useRecoilState } from "recoil";
import { GetCandidateWallets } from "../libs/API";
import { toast } from "react-hot-toast";
import Spinner from "../components/Spinner";
import Navbar from "../components/Navbar";

interface CandidateResult {
  name: string;
  party?: string;
  public_key: string;
  tokens: number;
  location?: string;
}

const ResultsPage = () => {
  const [loading, setLoading] = useState(false);
  const [wallets, setWallets] = useRecoilState(CandidateWalletsState);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const getWallet = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const data = await GetCandidateWallets();
      const W = data?.wallets;
      if (W) {
        setWallets({ candidates: W });
        setLastRefresh(new Date());
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Failed to fetch results.", { style: { background: "#111", color: "#fff" } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getWallet(true);
    const interval = setInterval(() => getWallet(false), 5000);
    return () => clearInterval(interval);
  }, []);

  // Sort by vote count descending
  const sorted: CandidateResult[] = [...(wallets?.candidates || [])].sort(
    (a, b) => b.tokens - a.tokens
  );
  const totalVotes = sorted.reduce((sum, c) => sum + c.tokens, 0);
  const leader = sorted[0];

  const avatarColors = [
    "from-violet-500 to-indigo-600",
    "from-pink-500 to-rose-600",
    "from-teal-500 to-cyan-600",
    "from-amber-500 to-orange-600",
    "from-green-500 to-emerald-600",
  ];

  const getPercent = (votes: number) =>
    totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
                Live <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Results</span>
              </h1>
              <p className="text-sm text-muted mt-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                Auto-refreshing every 5 seconds · Last updated {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => getWallet(true)}
              className="flex items-center gap-2 px-4 py-2 glass-card border-primary/30 hover:border-primary/60 text-white text-sm font-medium rounded-xl transition-all duration-200"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <Spinner />
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Votes", value: totalVotes, icon: "🗳️", color: "text-white" },
                  { label: "Candidates", value: sorted.length, icon: "👤", color: "text-white" },
                  {
                    label: "Leading",
                    value: leader?.name?.split(" ")[0] || "–",
                    icon: "🏆",
                    color: "text-yellow-400",
                  },
                  {
                    label: "Lead %",
                    value: leader ? `${getPercent(leader.tokens)}%` : "–",
                    icon: "📊",
                    color: "text-accent",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="glass-card p-4 text-center">
                    <div className="text-2xl mb-2">{stat.icon}</div>
                    <p className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-muted mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Leader spotlight */}
              {leader && leader.tokens > 0 && (
                <div className="glass-card p-6 md:p-8 relative overflow-hidden border-primary/30">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-primary/5 to-transparent pointer-events-none" />
                  <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative flex-shrink-0">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                        {leader.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center text-sm shadow-md">
                        🏆
                      </div>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-xs text-yellow-400 uppercase tracking-widest font-semibold mb-1">Current Leader</p>
                      <h2 className="text-2xl md:text-3xl font-display font-bold text-white">{leader.name}</h2>
                      {leader.party && (
                        <p className="text-muted text-sm mt-1">{leader.party}</p>
                      )}
                    </div>
                    <div className="text-center flex-shrink-0">
                      <p className="text-5xl font-display font-black text-white">{leader.tokens}</p>
                      <p className="text-xs text-muted mt-1">votes ({getPercent(leader.tokens)}%)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Full results table */}
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                  <h2 className="font-display font-semibold text-white">All Candidates</h2>
                  <span className="text-xs text-muted">{totalVotes} total votes</span>
                </div>

                {sorted.length === 0 ? (
                  <div className="p-16 flex flex-col items-center gap-4 text-center">
                    <div className="text-4xl">📊</div>
                    <p className="font-display font-semibold text-white">No votes recorded yet</p>
                    <p className="text-sm text-muted">Results will appear here once voting begins.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {sorted.map((candidate, index) => {
                      const percent = getPercent(candidate.tokens);
                      const colorClass = avatarColors[index % avatarColors.length];
                      const isLeading = index === 0 && candidate.tokens > 0;

                      return (
                        <div key={candidate.public_key} className={`px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors duration-200 hover:bg-primary/5 ${isLeading ? "bg-yellow-500/5" : ""}`}>
                          {/* Rank + avatar */}
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="flex-shrink-0 w-8 text-center">
                              {isLeading ? (
                                <span className="text-xl">🏆</span>
                              ) : (
                                <span className="text-muted font-bold text-lg">#{index + 1}</span>
                              )}
                            </div>
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                              {candidate.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate">{candidate.name}</p>
                              {candidate.party && (
                                <p className="text-xs text-muted mt-0.5">{candidate.party}</p>
                              )}
                              <p className="text-xs text-muted/60 font-mono mt-0.5 truncate">
                                {`${candidate.public_key.slice(0, 8)}...${candidate.public_key.slice(-6)}`}
                              </p>
                            </div>
                          </div>

                          {/* Vote bar */}
                          <div className="flex-1 max-w-xs">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-muted">{percent}% of votes</span>
                              <span className="text-sm font-bold text-white">
                                {candidate.tokens} vote{candidate.tokens !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="h-2.5 bg-border/40 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${isLeading ? "bg-gradient-to-r from-yellow-400 to-amber-500" : "bg-gradient-to-r from-primary to-accent"}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notice */}
              <div className="glass-card p-4 flex items-start gap-3 border-l border-l-primary/50">
                <span className="text-primary text-xl">⛓️</span>
                <div>
                  <p className="text-sm font-semibold text-white">Blockchain-Verified Tally</p>
                  <p className="text-xs text-muted mt-1">
                    All vote counts are derived directly from on-chain transaction records. Each vote is individually hashed and signed using HMAC-SHA256. Results shown here are real-time and cannot be altered retroactively.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResultsPage;
