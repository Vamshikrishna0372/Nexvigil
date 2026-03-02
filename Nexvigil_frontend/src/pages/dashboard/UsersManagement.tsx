import { useState } from "react";
import { Search, Shield, User, Mail, Calendar, Edit2, Trash2, CheckCircle, XCircle, Plus, AlertTriangle, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const UsersManagement = () => {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "operator" });
  const [editingUser, setEditingUser] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const { data } = await api.users.list();
      return (data as any[]) || [];
    },
    enabled: isAdmin
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.users.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      toast({ title: "Operator Registered", description: "A new system operator has been successfully onboarded." });
      setIsAddUserOpen(false);
      setNewUser({ name: "", email: "", password: "", role: "operator" });
    },
    onError: (error: any) => {
      toast({
        title: "Onboarding Failed",
        description: error.message || "Failed to create new operator account.",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      toast({ title: "Success", description: "User deleted successfully." });
      setUserToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user.",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => api.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      toast({ title: "Success", description: "User updated successfully." });
      setIsEditUserOpen(false);
      setEditingUser(null);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not save user changes.",
        variant: "destructive"
      });
    }
  });

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({ title: "Incomplete Data", description: "Please provide all required fields for the new account.", variant: "destructive" });
      return;
    }
    createMutation.mutate(newUser);
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser.name || !editingUser.email) {
      toast({ title: "Incomplete Data", description: "Name and email are required fields.", variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      id: editingUser.id || editingUser._id,
      data: {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role
      }
    });
  };

  if (!isAdmin) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="glass-panel p-10 rounded-3xl border-destructive/20 text-center space-y-4 max-w-md">
        <Shield className="w-16 h-16 text-destructive mx-auto opacity-80" />
        <h2 className="text-2xl font-black tracking-tighter text-destructive uppercase">Access Denied</h2>
        <p className="text-muted-foreground font-medium">Administrator privileges are required to access this sector of the management matrix.</p>
        <Button onClick={() => window.history.back()} variant="outline" className="rounded-xl mt-4">Return to Command Center</Button>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-lg rounded-lg" />
      <div className="glass-panel rounded-xl border border-border/10 overflow-hidden">
        <div className="p-4 bg-secondary/30 flex gap-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6 ml-auto" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-4 border-t border-border/10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-1/4">
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-8 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );

  const filtered = users.filter((u: any) =>
    (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between flex-wrap gap-6">
        <div>
          <h1 className="text-3xl font-black text-foreground font-display tracking-tight uppercase">User Management</h1>
          <p className="text-muted-foreground mt-1.5 font-medium max-w-xl">Configure system access permissions, manage active operator profiles, and monitor security clearance levels.</p>
        </div>
        <Button
          onClick={() => setIsAddUserOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl px-6 h-12 font-black uppercase tracking-widest text-xs gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Register New Operator
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search operator registry by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-12 h-12 bg-secondary/40 border-border/60 focus:ring-primary/20 rounded-2xl text-base"
          />
        </div>
      </div>

      <div className="glass-panel rounded-[2rem] overflow-hidden border border-border/40 shadow-xl bg-card/30 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead className="bg-secondary/40 border-b border-border/40">
              <tr>
                <th className="p-5 font-black text-muted-foreground uppercase tracking-[0.2em] text-[10px]">OPERATOR IDENTITY</th>
                <th className="p-5 font-black text-muted-foreground uppercase tracking-[0.2em] text-[10px]">CLEARANCE LEVEL</th>
                <th className="p-5 font-black text-muted-foreground uppercase tracking-[0.2em] text-[10px]">ACCOUNT STATUS</th>
                <th className="p-5 font-black text-muted-foreground uppercase tracking-[0.2em] text-[10px]">JOINED</th>
                <th className="p-5 font-black text-muted-foreground uppercase tracking-[0.2em] text-[10px]">LAST HEARTBEAT</th>
                <th className="p-5 font-black text-muted-foreground text-right uppercase tracking-[0.2em] text-[10px]">COMMANDS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-foreground/90">
              {filtered.map((u: any) => (
                <tr key={u.id} className="hover:bg-primary/[0.03] transition-all group/row">
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-inner overflow-hidden group-hover/row:scale-110 transition-transform">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-black text-foreground leading-tight tracking-tight text-base">{u.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 font-medium"><Mail className="w-3.5 h-3.5 opacity-60" />{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-1.5 rounded-lg border",
                        u.role === "admin" ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-primary/10 border-primary/20 text-primary"
                      )}>
                        {u.role === "admin" ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <span className={cn("font-black uppercase text-[11px] tracking-widest", u.role === "admin" ? "text-destructive" : "text-primary/80")}>{u.role}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full border cursor-pointer hover:brightness-110 transition-all",
                      u.status === "active" ? "text-success border-success/30 bg-success/5 shadow-[0_0_10px_rgba(34,197,94,0.1)]" : "text-muted-foreground border-border bg-secondary/30"
                    )} onClick={() => {
                      const newStatus = u.status === "active" ? "inactive" : "active";
                      updateMutation.mutate({ id: u.id || u._id, data: { status: newStatus } });
                    }}>
                      <div className={cn("w-1.5 h-1.5 rounded-full mr-2", u.status === "active" ? "bg-success animate-pulse" : "bg-muted-foreground/40")} />
                      {u.status}
                    </Badge>
                  </td>
                  <td className="p-5 text-muted-foreground font-mono text-[11px] font-bold">
                    <div className="flex items-center gap-2 bg-secondary/30 px-2 py-1 rounded-lg w-fit"><Calendar className="w-3.5 h-3.5 opacity-60" /> {new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                  </td>
                  <td className="p-5 text-muted-foreground font-mono text-[11px] font-bold">
                    {u.last_login ? (
                      <div className="flex items-center gap-2 text-foreground/80">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                        {new Date(u.last_login).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    ) : "---"}
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-all translate-x-4 group-hover/row:translate-x-0">
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl" onClick={() => {
                        setEditingUser(u);
                        setIsEditUserOpen(true);
                      }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => setUserToDelete(u.id || u._id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-32 text-center flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-secondary/20 flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-muted-foreground/30 font-thin" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Registry Search Exhausted</h3>
              <p className="text-muted-foreground font-medium max-w-xs mx-auto">No operational profiles found matching your current encryption filters.</p>
              <Button onClick={() => setSearch("")} variant="link" className="text-primary font-bold uppercase tracking-widest text-[10px] mt-2">Clear Filter Matrix</Button>
            </div>
          )}
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/80 rounded-[2rem] shadow-3xl max-w-md p-8">
          <DialogHeader className="space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 mx-auto sm:mx-0">
              <Plus className="w-7 h-7 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight uppercase">Register Operator</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              Create a new administrative or operator profile to grant access to the surveillance grid.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-muted-foreground/80">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={newUser.name}
                    onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-secondary/30 h-12 pl-12 rounded-xl border-none focus-visible:ring-1 focus-visible:ring-primary/40 transition-all font-bold"
                    placeholder="Enter operator name..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-muted-foreground/80">Comm Address (Email)</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-secondary/30 h-12 pl-12 rounded-xl border-none focus-visible:ring-1 focus-visible:ring-primary/40 transition-all font-bold"
                    placeholder="operator@nexvigil.ai"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-muted-foreground/80">Secure Passphrase</Label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-secondary/30 h-12 pl-12 rounded-xl border-none focus-visible:ring-1 focus-visible:ring-primary/40 transition-all font-bold"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-muted-foreground/80">Access Level</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={newUser.role === "operator" ? "default" : "secondary"}
                    className="flex-1 rounded-xl h-10 font-bold text-[11px] uppercase tracking-wider transition-all"
                    onClick={() => setNewUser(prev => ({ ...prev, role: "operator" }))}
                  >
                    Operator
                  </Button>
                  <Button
                    type="button"
                    variant={newUser.role === "admin" ? "destructive" : "secondary"}
                    className="flex-1 rounded-xl h-10 font-bold text-[11px] uppercase tracking-wider transition-all"
                    onClick={() => setNewUser(prev => ({ ...prev, role: "admin" }))}
                  >
                    Administrator
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter className="sm:justify-start gap-3 mt-8">
              <Button
                type="submit"
                className="flex-1 rounded-xl h-12 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Syncing..." : "Initialize Profile"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl h-12 px-6 font-bold"
                onClick={() => setIsAddUserOpen(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/80 rounded-[2rem] shadow-3xl max-w-md p-8">
          <DialogHeader className="space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 mx-auto sm:mx-0">
              <Edit2 className="w-7 h-7 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight uppercase">Modify Operator</DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              Update security clearance and profile details for this system entity.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleEditUser} className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-muted-foreground/80">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={editingUser.name}
                      onChange={e => setEditingUser((prev: any) => ({ ...prev, name: e.target.value }))}
                      className="bg-secondary/30 h-12 pl-12 rounded-xl border-none focus-visible:ring-1 focus-visible:ring-primary/40 transition-all font-bold text-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-muted-foreground/80">Comm Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={editingUser.email}
                      onChange={e => setEditingUser((prev: any) => ({ ...prev, email: e.target.value }))}
                      className="bg-secondary/30 h-12 pl-12 rounded-xl border-none focus-visible:ring-1 focus-visible:ring-primary/40 transition-all font-bold text-foreground"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-muted-foreground/80">Clearance Authorization</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={editingUser.role === "operator" ? "default" : "secondary"}
                      className="flex-1 rounded-xl h-10 font-bold text-[11px] uppercase tracking-wider transition-all"
                      onClick={() => setEditingUser((prev: any) => ({ ...prev, role: "operator" }))}
                    >
                      Operator
                    </Button>
                    <Button
                      type="button"
                      variant={editingUser.role === "admin" ? "destructive" : "secondary"}
                      className="flex-1 rounded-xl h-10 font-bold text-[11px] uppercase tracking-wider transition-all"
                      onClick={() => setEditingUser((prev: any) => ({ ...prev, role: "admin" }))}
                    >
                      Administrator
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter className="sm:justify-start gap-3 mt-8">
                <Button
                  type="submit"
                  className="flex-1 rounded-xl h-12 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Synchronizing..." : "Update Protocol"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl h-12 px-6 font-bold"
                  onClick={() => setIsEditUserOpen(false)}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={userToDelete !== null} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border/80 rounded-[2rem] shadow-3xl p-8">
          <AlertDialogHeader className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto sm:mx-0">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-foreground">
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium">
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-6">
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold"
              onClick={() => userToDelete && deleteMutation.mutate(userToDelete)}
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersManagement;


