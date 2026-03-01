import { useState } from "react";
import { Search, Shield, User, Mail, Calendar, Edit2, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const UsersManagement = () => {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      toast({ title: "User deleted" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => api.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      toast({ title: "User updated" });
    }
  });

  if (!isAdmin) return <div className="p-8 text-center text-destructive">Access Denied. Administrator privileges required.</div>;

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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Users Management</h1>
          <p className="text-muted-foreground mt-1">Manage system access and account roles</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-secondary/50 border-border focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden border border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/30 border-b border-border">
              <tr>
                <th className="p-4 font-semibold text-muted-foreground">User</th>
                <th className="p-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Role</th>
                <th className="p-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Status</th>
                <th className="p-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Joined</th>
                <th className="p-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Last Login</th>
                <th className="p-4 font-semibold text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((u: any) => (
                <tr key={u.id} className="hover:bg-secondary/20 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground leading-tight">{u.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      {u.role === "admin" ? <Shield className="w-3 h-3 text-destructive" /> : <User className="w-3 h-3 text-muted-foreground" />}
                      <span className={u.role === "admin" ? "text-destructive font-medium" : "text-foreground"}>{u.role}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className={u.status === "active" ? "text-success border-success/30 bg-success/5" : "text-muted-foreground border-border bg-secondary/30"}>
                      {u.status === "active" ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {u.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-muted-foreground font-mono text-[11px]">
                    <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {new Date(u.created_at).toLocaleDateString(undefined)}</div>
                  </td>
                  <td className="p-4 text-muted-foreground font-mono text-[11px]">
                    {u.last_login ? new Date(u.last_login).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true }) : "Never"}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => {
                        const newStatus = u.status === "active" ? "inactive" : "active";
                        updateMutation.mutate({ id: u.id, data: { status: newStatus } });
                      }}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(u.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-12 text-center text-muted-foreground italic">No users found matching your search.</div>}
        </div>
      </div>
    </div>
  );
};

export default UsersManagement;
