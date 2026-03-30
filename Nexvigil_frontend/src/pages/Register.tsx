import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

import { API_BASE } from "@/services/api";

const Register = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register } = useAuth();

  const update = (key: string, val: string) => { setForm((p) => ({ ...p, [key]: val })); setError(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password || !form.confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const result = await register(form.name, form.email, form.password);
    setLoading(false);
    if (result.success) {
      toast({ title: "Registration Successful", description: "Your account has been created and session initialized." });
      navigate("/dashboard");
    } else {
      setError(result.error || "Registration failed.");
    }
  };

  return (
    <>
      {loading && <LoadingOverlay text="PREPARING YOUR SECURE ACCESS..." />}
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">Nexvigil</span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">Start monitoring with AI-powered surveillance</p>
          </div>
          <div className="glass-panel rounded-xl p-8 space-y-5">
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm text-muted-foreground">Full Name</Label>
                <Input id="name" placeholder="John Doe" value={form.name} onChange={(e) => update("name", e.target.value)} className="bg-secondary/50 border-border/50 h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
                <Input id="email" type="email" placeholder="operator@nexvigil.com" value={form.email} onChange={(e) => update("email", e.target.value)} className="bg-secondary/50 border-border/50 h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPw ? "text" : "password"} placeholder="Min 8 characters" value={form.password} onChange={(e) => update("password", e.target.value)} className="bg-secondary/50 border-border/50 h-11 pr-10" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-sm text-muted-foreground">Confirm Password</Label>
                <Input id="confirm" type="password" placeholder="••••••••" value={form.confirm} onChange={(e) => update("confirm", e.target.value)} className="bg-secondary/50 border-border/50 h-11" />
              </div>
              <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                {loading ? "Please wait..." : "Create Account"}
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
              <span>Sign up with Google</span>
            </a>

            <p className="text-center text-sm text-muted-foreground pt-2">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Register;
