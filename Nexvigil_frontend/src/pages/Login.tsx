import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, AlertCircle, Scan, Radio, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useEffect } from "react";

import { API_BASE } from "@/services/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const { toast } = useToast();
  const { login, isAuthenticated } = useAuth();
 
  useEffect(() => {
    // If already authenticated, go to dashboard
    if (isAuthenticated) {
      navigate("/dashboard");
      return;
    }
 
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam) {
      if (errorParam === "auth_proxy_down") {
        setError("The authentication service (Port 8081) was unavailable. It has now been started automatically. Please try again.");
      } else if (errorParam === "auth_failed") {
        setError("Google authentication failed. Please try again.");
      } else {
        setError(`Authentication error: ${errorParam.replace(/_/g, " ")}`);
      }
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      toast({ title: "Authentication successful", description: "Your session has been initialized." });
      navigate("/dashboard");
    } else {
      setError(result.error || "Invalid credentials.");
    }
  };

  return (
    <>
      {loading && <LoadingOverlay text="AUTHENTICATING SESSION..." />}
      <div className="min-h-screen bg-background flex text-foreground">
        {/* Left Brand Panel */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] relative overflow-hidden flex-col justify-between p-12">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)/0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.3) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />

          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground tracking-tight">Nexvigil</span>
            </Link>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="relative z-10 space-y-6">
            <h1 className="text-4xl xl:text-5xl font-bold text-foreground leading-tight">
              Real-Time AI<br />
              <span className="text-primary">Surveillance</span><br />
              Intelligence
            </h1>
            <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
              Secure monitoring powered by intelligent detection and event-based alerting.
            </p>
            <div className="space-y-4 pt-4">
              {[
                { icon: Scan, text: "YOLOv8 Object Detection Engine" },
                { icon: Radio, text: "Real-Time Event Monitoring" },
                { icon: Lock, text: "Enterprise-Grade Security" },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.5 + i * 0.15 }} className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm">{item.text}</span>
                </motion.div>
              ))}
            </div>


          </motion.div>

          <div className="relative z-10">
            <p className="text-xs text-muted-foreground/50">© 2026 Nexvigil. All rights reserved.</p>
          </div>
        </div>

        {/* Right Login Panel */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md text-foreground">
            <div className="lg:hidden text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2 mb-4">
                <Shield className="h-7 w-7 text-primary" />
                <span className="text-xl font-bold text-foreground">Nexvigil</span>
              </Link>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
              <p className="text-muted-foreground mt-1 text-sm">Sign in to your surveillance dashboard</p>
            </div>

            <div className="glass-panel rounded-xl p-8 space-y-6">
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-muted-foreground">Email address</Label>
                  <Input id="email" type="email" placeholder="operator@nexvigil.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} className="bg-secondary/50 border-border/50 h-11 focus:border-primary/50" autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} className="bg-secondary/50 border-border/50 h-11 pr-10 focus:border-primary/50" autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" />
                    <Label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer">Remember me</Label>
                  </div>
                  <button type="button" className="text-xs text-primary hover:text-primary/80 transition-colors">Forgot password?</button>
                </div>
                <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                  {loading ? "Please wait..." : "Sign In"}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/40" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-bold">
                  <span className="bg-card px-4 text-muted-foreground/40">Secure Identity</span>
                </div>
              </div>

              <a
                href={`${API_BASE}/auth/google/login?origin=${encodeURIComponent(window.location.origin)}`}
                className="w-full h-11 rounded-xl bg-white text-[#1f1f1f] hover:bg-gray-50 flex items-center justify-center transition-all duration-300 text-sm font-semibold shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] group overflow-hidden"
              >
                <div className="mr-3 bg-white p-1 rounded-sm">
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                <span>Continue with Google</span>
              </a>
              <p className="text-center text-xs text-muted-foreground pt-2">
                Don't have an account?{" "}
                <Link to="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">Create one</Link>
              </p>


            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Login;
