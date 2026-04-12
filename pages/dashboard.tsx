import { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import { useRouter } from "next/router";
import { authState } from "../atoms";
import Navbar from "../components/Navbar";
import Wallet from "../components/Wallet";
import { GetVoterByID } from "../libs/API";
import { Election } from "../components/ElectionCard";
import { toast } from "react-hot-toast";
import Elections from "../components/Elections";
import Spinner from "../components/Spinner";
import { AUTH_BYPASS_ENABLED, DEV_AUTH_STATE } from "../libs/devAuth";

const Dashboard = () => {
  const auth = useRecoilValue(authState);
  const router = useRouter();
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(false);
  const displayName = auth?.name || (AUTH_BYPASS_ENABLED ? DEV_AUTH_STATE.name : "Voter");
  const firstName = displayName.split(" ")[0];

  const getTimeGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const getData = async () => {
    try {
      if (!auth.token && !AUTH_BYPASS_ENABLED) return;
      setLoading(true);
      const data = await GetVoterByID(auth.token);
      const E = data?.elections?.map((election: any) => ({
        ...election.electionId,
        status: election.status,
      }));
      setElections(E || []);
    } catch {
      toast.error("Could not load voter data.", { style: { background: "#111", color: "#fff" } });
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
  }, [auth?.isLoggedIn, auth?.token]);

  const totalActive = elections.filter((e) => e.status === "incomplete").length;
  const totalDone = elections.filter((e) => e.status === "complete").length;

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
            {/* Welcome Banner */}
            <div className="glass-card p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-accent/5 rounded-full blur-[60px] pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <p className="text-muted text-sm font-medium uppercase tracking-widest mb-1">{getTimeGreeting()}</p>
                  <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
                    {firstName} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">👋</span>
                  </h1>
                  <p className="text-muted mt-2 text-sm max-w-md">
                    Welcome back to ChainVote — your secure blockchain e-voting portal. Your votes are encrypted, immutable, and fully auditable.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="glass-card px-5 py-4 text-center min-w-[100px]">
                    <p className="text-3xl font-display font-bold text-primary">{totalActive}</p>
                    <p className="text-xs text-muted mt-1">Pending<br/>Votes</p>
                  </div>
                  <div className="glass-card px-5 py-4 text-center min-w-[100px]">
                    <p className="text-3xl font-display font-bold text-success">{totalDone}</p>
                    <p className="text-xs text-muted mt-1">Votes<br/>Cast</p>
                  </div>
                  <div className="glass-card px-5 py-4 text-center min-w-[100px]">
                    <p className="text-3xl font-display font-bold text-accent">{elections.length}</p>
                    <p className="text-xs text-muted mt-1">Total<br/>Elections</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security info strip */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: "🔐", label: "SHA-256 Encrypted" },
                { icon: "⛓️", label: "Blockchain Immutable" },
                { icon: "🔍", label: "Fully Auditable" },
                { icon: "🏛️", label: "Hyperledger Architecture" },
              ].map((tag) => (
                <div
                  key={tag.label}
                  className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border/50 rounded-full text-xs text-muted"
                >
                  <span>{tag.icon}</span>
                  <span>{tag.label}</span>
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <div className="flex-1 min-w-0">
                <Elections elections={elections} />
              </div>
              <Wallet />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
