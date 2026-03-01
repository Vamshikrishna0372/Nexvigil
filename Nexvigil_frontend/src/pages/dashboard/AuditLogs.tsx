import { ScrollText, User, Search, Filter, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

import { Skeleton } from "@/components/ui/skeleton";

const AuditLogs = () => {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data } = await api.audit.logs(200);
      return (data as any[]) || [];
    }
  });

  const filtered = logs.filter((a: any) => {
    const matchSearch = (a.user_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.action || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.details || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || a.category === catFilter;
    return matchSearch && matchCat;
  });

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-96 rounded-full" />
        </div>
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <div className="glass-panel rounded-xl overflow-hidden border border-border/10 divide-y divide-border/10">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 py-4">
            <Skeleton className="h-4 w-[160px] shrink-0" />
            <div className="flex items-center gap-2 w-40 shrink-0">
              <Skeleton className="w-6 h-6 rounded-full shrink-0" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-16 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-5 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-24 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ScrollText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">Complete activity trail for governance & compliance — {logs.length} entries</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[150px] bg-secondary border-border"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="camera">Camera</SelectItem>
            <SelectItem value="alert">Alert</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="security">Security</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="divide-y divide-border/50">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground italic">No audit logs found.</div>
          ) : filtered.map((log: any, idx: number) => (
            <div key={log.id || log._id || idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors border-b border-border/10">
              <span className="text-[10px] font-mono text-muted-foreground w-[160px] shrink-0">
                {new Date(log.timestamp).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
              <div className="flex items-center gap-2 w-40 shrink-0">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-3 h-3 text-primary" />
                </div>
                <span className="text-xs text-foreground truncate">{log.user_id === "system" ? "SYSTEM" : `User ${log.user_id?.slice(-4) || '???'}`}</span>
              </div>
              <Badge variant="outline" className="text-[9px] border-primary/30 text-primary w-fit flex-shrink-0">{log.category}</Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate font-medium">{log.action}</p>
                {log.details && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                  </p>
                )}
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{log.ip_address}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
