import { useState } from "react";
import { User, Mail, Shield, Lock, Camera, Calendar, Clock, Eye, EyeOff, Upload, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const getPasswordStrength = (pw: string) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  return score;
};

const strengthLabels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
const strengthColors = ["bg-destructive", "bg-destructive", "bg-warning", "bg-primary", "bg-success"];

const Profile = () => {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const pwStrength = getPasswordStrength(newPw);

  const initName = () => {
    if (!fullName && user?.name) setFullName(user.name);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 1200));
    setSaving(false);
    toast({ title: "Profile Modifications Persisted", description: "Your administrative profile has been updated successfully." });
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) return;
    if (newPw !== confirmPw) {
      toast({ title: "Validation Error", description: "Password confirmation does not match the new password.", variant: "destructive" });
      return;
    }
    if (pwStrength < 2) {
      toast({ title: "Security Threshold Not Met", description: "The provided password does not meet complexity requirements.", variant: "destructive" });
      return;
    }
    setChangingPw(true);
    await new Promise(r => setTimeout(r, 1500));
    setChangingPw(false);
    toast({ title: "Credential Update Successful", description: "Access credentials have been updated." });
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
  };

  const handleLogout = () => { logout(); navigate("/"); };

  const lastLogin = new Date(Date.now() - 3600000).toLocaleString();
  const accountCreated = "January 15, 2024";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* User Info Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="relative group">
            <div className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold transition-all",
              isAdmin ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
            )}>
              {user?.name?.charAt(0) || "U"}
            </div>
            <button className="absolute inset-0 rounded-2xl bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
              <Badge variant="outline" className={cn(
                "text-[10px] gap-1",
                isAdmin ? "text-destructive border-destructive/30" : "text-primary border-primary/30"
              )}>
                <Shield className="w-2.5 h-2.5" />
                {isAdmin ? "Administrator" : "Standard User"}
              </Badge>
              <Badge variant="outline" className="text-[10px] text-success border-success/30 gap-1">
                <Check className="w-2.5 h-2.5" /> Active
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Mail className="w-3.5 h-3.5" /> {user?.email}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last login: {lastLogin}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined: {accountCreated}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Edit Profile */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Edit Profile</h3>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={fullName || user?.name || ""}
                onChange={e => setFullName(e.target.value)}
                onFocus={initName}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input value={user?.email || ""} disabled className="bg-secondary/30 border-border/30 opacity-60" />
              <p className="text-[10px] text-muted-foreground">Email cannot be changed</p>
            </div>
          </div>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </motion.div>

      {/* Change Password */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Change Password</h3>
        <form onSubmit={changePw} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <div className="relative max-w-sm">
              <Input type={showCurrent ? "text" : "password"} value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="bg-secondary/50 border-border/50 pr-10" />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>New Password</Label>
            <div className="relative max-w-sm">
              <Input type={showNew ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)} className="bg-secondary/50 border-border/50 pr-10" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPw && (
              <div className="max-w-sm space-y-1">
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i < pwStrength ? strengthColors[pwStrength - 1] : "bg-secondary")} />
                  ))}
                </div>
                <p className={cn("text-[11px]", pwStrength >= 3 ? "text-success" : pwStrength >= 2 ? "text-warning" : "text-destructive")}>
                  {strengthLabels[Math.max(0, pwStrength - 1)]}
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Confirm Password</Label>
            <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="bg-secondary/50 border-border/50 max-w-sm" />
            {confirmPw && newPw !== confirmPw && (
              <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Passwords don't match</p>
            )}
          </div>
          <Button type="submit" disabled={changingPw} className="gap-2">
            {changingPw ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Lock className="w-4 h-4" />}
            {changingPw ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </motion.div>

      {/* Admin Privileges */}
      {isAdmin && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel rounded-xl p-6 border-destructive/20">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-destructive" /> Administrator Privileges</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {["Full System Access", "User Management", "Camera Configuration", "Alert Rule Engine", "Audit Log Access", "Storage Management", "AI Engine Control", "Evidence Vault Admin"].map(p => (
              <div key={p} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-success" /> {p}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <Separator />

      <Button variant="destructive" className="gap-2" onClick={handleLogout}>
        <Lock className="w-4 h-4" /> Sign Out
      </Button>
    </div>
  );
};

export default Profile;
