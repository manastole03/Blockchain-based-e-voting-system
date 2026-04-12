import React, { useEffect, useState } from "react";
import { GetElectionCandidates } from "../../libs/API";
import { useRecoilValue } from "recoil";
import { authState } from "../../atoms";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import Navbar from "../../components/Navbar";
import Wallet from "../../components/Wallet";
import Candidates from "../../components/Candidates";
import Spinner from "../../components/Spinner";
import { AUTH_BYPASS_ENABLED } from "../../libs/devAuth";

const electionMeta: Record<string, { name: string; description: string; date: string; category: string }> = {
  "dev-election-1": {
    name: "Student Council 2026",
    description: "Elect your Student Council President for an academic year of change, innovation, and student-first policies.",
    date: "April 15 – April 20, 2026",
    category: "Student Government",
  },
  "dev-election-2": {
    name: "Tech Fest Committee",
    description: "Vote for the organizing committee members for TechFest 2027 — the annual inter-college technology festival.",
    date: "April 12 – April 18, 2026",
    category: "Campus Events",
  },
  "election-2026-sc": {
    name: "Student Council 2026",
    description: "Elect your Student Council President for an academic year of change, innovation, and student-first policies.",
    date: "April 15 – April 20, 2026",
    category: "Student Government",
  },
  "election-2026-tech": {
    name: "Tech Fest Committee",
    description: "Vote for the organizing committee members for TechFest 2027.",
    date: "April 12 – April 18, 2026",
    category: "Campus Events",
  },
};

const ElectionPage = () => {
  const router = useRouter();
  const auth = useRecoilValue(authState);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const idParam = Array.isArray(router.query.id) ? router.query.id[0] : router.query.id;
  const meta = electionMeta[idParam || ""] || null;

  const getData = async () => {
    const token = auth?.token;
    try {
      if (!idParam) return;
      setLoading(true);
      const data = await GetElectionCandidates(token, idParam, auth?.locationId);
      setCandidates(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to fetch election data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth?.isLoggedIn && !AUTH_BYPASS_ENABLED) {
      router.push("/");
      return;
    }
    getData();
  }, [auth?.isLoggedIn, router.isReady, router.query.id]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Spinner />
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted">
              <button onClick={() => router.push("/dashboard")} className="hover:text-white transition-colors">Dashboard</button>
              <span>/</span>
              <span className="text-white">{meta?.name || "Election"}</span>
            </div>

            {/* Election header */}
            {meta && (
              <div className="glass-card p-6 md:p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-3xl flex-shrink-0">
                    {meta.category === "Student Government" ? "🏛️" : "🎉"}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h1 className="text-2xl md:text-3xl font-display font-bold text-white">{meta.name}</h1>
                      <span className="px-2.5 py-1 bg-success/10 border border-success/20 rounded-full text-xs text-success font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                        Voting Open
                      </span>
                    </div>
                    <p className="text-muted text-sm leading-relaxed max-w-2xl">{meta.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted">
                      <span className="flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {meta.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>
                        {meta.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main layout */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <div className="flex-1 min-w-0">
                <Candidates candidates={candidates} electionName={meta?.name} />
              </div>
              <Wallet />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ElectionPage;
