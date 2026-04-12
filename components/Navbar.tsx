import Link from "next/link";
import { useRecoilState, useRecoilValue } from "recoil";
import { authState, WalletState } from "../atoms";
import { useRouter } from "next/router";
import { AUTH_BYPASS_ENABLED, DEV_AUTH_STATE, resetDevSession } from "../libs/devAuth";
import { toast } from "react-hot-toast";

const Navbar = () => {
  const [auth, setAuth] = useRecoilState(authState);
  const wallet = useRecoilValue(WalletState);
  const router = useRouter();

  const handleLogout = () => {
    setAuth({ name: "", email: "", id: "", isLoggedIn: false, token: "", locationId: "" });
    if (AUTH_BYPASS_ENABLED) resetDevSession();
    toast("Logged out securely.", { style: { background: "#111", color: "#888" } });
    router.push("/");
  };

  const displayName = auth?.name || (AUTH_BYPASS_ENABLED ? DEV_AUTH_STATE.name : "Voter");
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const navLinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Results", href: "/candidates" },
    { label: "Verify Vote", href: "/validate" },
  ];

  return (
    <header>
      {/* Logo */}
      <div
        className="flex items-center gap-3 cursor-pointer select-none"
        onClick={() => router.push("/dashboard")}
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="font-display font-bold text-lg text-white hidden sm:block">
          <span className="text-primary">Chain</span>Vote
        </span>
      </div>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${router.pathname === link.href
                ? "bg-primary/20 text-primary"
                : "text-muted hover:text-white hover:bg-border/40"
              }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Token badge */}
        <div className="hidden sm:flex items-center gap-2 bg-surface border border-border/60 rounded-full px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-medium text-white">{wallet.tokens} Token{wallet.tokens !== 1 ? "s" : ""}</span>
        </div>

        {/* Avatar + logout */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/60 to-secondary/60 flex items-center justify-center text-white text-xs font-bold border border-primary/30">
            {initials}
          </div>
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-1.5 text-muted hover:text-white text-sm transition-colors duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
