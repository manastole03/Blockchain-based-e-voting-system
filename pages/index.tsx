import { useState, useEffect } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { authState } from "../atoms";
import Input from "../components/Input";
import Button, { OutlinedButton } from "../components/Button";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import Spinner from "../components/Spinner";
import { Login } from "../libs/API";
import { AUTH_BYPASS_ENABLED, DEV_AUTH_STATE, resetDevSession } from "../libs/devAuth";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const auth = useRecoilValue(authState);
  const setAuthState = useSetRecoilState(authState);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth?.isLoggedIn) {
      router.push("/dashboard");
    }
  }, [auth?.isLoggedIn, router]);

  const handleBypassLogin = () => {
    resetDevSession();
    setAuthState(DEV_AUTH_STATE);
    toast.success("Auth bypass enabled", {
      style: { background: "#111", color: "#fff", border: "1px solid #333" },
    });
    router.push("/dashboard");
  };

  const handleLogin = async (event: any) => {
    event.preventDefault();
    if (email === "" || password === "") {
      toast("Please Enter Credentials", { style: { background: "#222", color: "#fff" } });
      return;
    }
    try {
      setLoading(true);
      const user = await Login(email, password);

      if (user?.user) {
        setAuthState({ ...user?.user, token: user.token, isLoggedIn: true });
        toast.success("Login Successful", { style: { background: "#111", color: "#00E676" } });
        router.push("dashboard");
      } else {
        throw new Error();
      }
    } catch (error: any) {
      toast.error(error?.message || "Invalid Credentials", { style: { background: "#222", color: "#FF1A1A" } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[150px]"></div>

      <div className="glass-card p-10 w-full max-w-md mx-4 relative z-10 animate-[pulse-slow_4s_ease-in-out_infinite] border-t border-primary/30">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
            Secure <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Voting</span>
          </h1>
          <p className="text-muted text-sm tracking-wide">Enter the next generation of trust.</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div>
            <Input
              label="Email Address"
              type="email"
              placeholder="voter@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Input
              label="Secret Key"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="mt-4">
            <Button onClick={handleLogin} className="w-full">
              {loading ? <Spinner /> : "Authenticate Identity"}
            </Button>
          </div>
        </form>

        {AUTH_BYPASS_ENABLED && (
          <div className="mt-8 flex flex-col items-center gap-4 border-t border-border/50 pt-6">
            <span className="text-xs text-muted uppercase tracking-widest font-semibold flex items-center gap-2">
              <span className="w-8 h-px bg-border/50"></span>
              Developer Mode
              <span className="w-8 h-px bg-border/50"></span>
            </span>
            <OutlinedButton onClick={handleBypassLogin} className="w-full">
              Bypass Authentication
            </OutlinedButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
