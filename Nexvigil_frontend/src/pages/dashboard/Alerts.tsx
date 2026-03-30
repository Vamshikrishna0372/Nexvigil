import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, Eye, Trash2, CheckCircle, User as UserIcon, Loader2, Camera, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const SEV_CONFIG: Record<string, { color: string; bg: string; border: string; glow: string }> = {
  critical: {
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    glow: "shadow-[0_0_15px_rgba(239,68,68,0.15)]"
  },
  high: {
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.1)]"
  },
  medium: {
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    glow: "shadow-[0_0_15px_rgba(var(--primary),0.1)]"
  },
  low: {
    color: "text-muted-foreground",
    bg: "bg-muted/30",
    border: "border-muted-foreground/20",
    glow: ""
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as any }
  }
};

const Alerts = () => {
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["alerts-list", severityFilter],
    queryFn: async () => {
      const params: any = { limit: 50 };
      if (severityFilter !== "all") params.severity = severityFilter;

      const { data } = await api.alerts.list(params);
      const res = data as any;
      console.log("DEBUG: Alerts API Response:", res); // Step 11
      if (res && Array.isArray(res.data)) {
        return res.data.map((a: any, idx: number) => ({
          id: a.id || a._id || `alert-${idx}`,
          object: a.object_detected,
          confidence: Math.round(a.confidence * 100),
          camera: a.camera_id, // Ideally fetch camera name map
          cameraOwner: a.owner_id,
          severity: a.severity,
          timestamp: new Date(a.created_at),
          acknowledged: a.is_acknowledged,
          ruleId: a.triggered_rule_id || "System",
          screenshot: a.screenshot_path,
          description: a.description
        }));

      }
      return [];
    },
    refetchInterval: 12000
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => api.alerts.acknowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts-list"] });
      toast({ title: "Event Acknowledged", description: "The incident has been verified and logged." });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.alerts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts-list"] });
      toast({ title: "Record Purged", description: "The event data has been removed from the system." });
    }
  });

  const filtered = alerts.filter((a: any) => {
    const matchSearch = a.object.toLowerCase().includes(search.toLowerCase()) || a.camera.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Alert Activity</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            {isAdmin ? "Monitoring global surveillance feed" : "Real-time security insights Dashboard"} — {filtered.length} active events
          </p>
        </div>
        {!isLoading && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/30 text-[10px] font-bold text-success uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            System Live
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search detections, camera IDs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-12 bg-secondary/50 border-border/50 hover:border-primary/50 focus:border-primary transition-all duration-300 rounded-xl"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[180px] h-12 bg-secondary/50 border-border/50 rounded-xl font-medium">
            <SelectValue placeholder="All Severities" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">Unlimited Feed</SelectItem>
            <SelectItem value="critical" className="text-destructive font-semibold">Critical Only</SelectItem>
            <SelectItem value="high" className="text-warning">High Priority</SelectItem>
            <SelectItem value="medium" className="text-primary">Standard Traffic</SelectItem>
            <SelectItem value="low">Low Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl overflow-hidden border border-border/40">
            <div className="bg-secondary/20 p-5 border-b border-border/40 flex justify-between">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-4 w-24 bg-muted/50" />)}
            </div>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="p-5 flex justify-between border-b border-border/10">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-3 h-3 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {/* Desktop Matrix */}
          <motion.div
            key="desktop-matrix"
            variants={itemVariants}
            className="hidden md:block glass-panel rounded-2xl overflow-hidden border border-border/40"
          >
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-widest text-muted-foreground font-bold bg-secondary/20">
                  <th className="p-5 font-bold">Detection Target</th>
                  <th className="p-5 font-bold">Confidence</th>
                  <th className="p-5 font-bold">Source Node</th>
                  {isAdmin && <th className="p-5 font-bold">Originator</th>}
                  <th className="p-5 font-bold">Protocol</th>
                  <th className="p-5 font-bold">Trace Timestamp</th>
                  <th className="p-5 text-right font-bold pr-8">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filtered.map((a: any, idx: number) => {
                  const s = SEV_CONFIG[a.severity] || SEV_CONFIG.low;
                  return (
                    <motion.tr
                      key={a.id || idx}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="group/row hover:bg-primary/[0.03] transition-all duration-300"
                    >
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="relative h-10 w-14 shrink-0 rounded-lg overflow-hidden border border-border/40 bg-black/20 group-hover/row:border-primary/40 transition-colors">
                            {a.screenshot ? (
                              <img
                                src={api.media.getScreenshotUrl(a.screenshot)}
                                alt={a.object}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover/row:scale-110"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center opacity-20">
                                <Activity className="w-4 h-4" />
                              </div>
                            )}
                            <div className={cn(
                              "absolute top-1 left-1 w-2 h-2 rounded-full",
                              a.severity === "critical" ? "bg-destructive animate-pulse" :
                                a.severity === "high" ? "bg-warning" : "bg-primary"
                            )} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-foreground capitalize tracking-tight group-hover/row:text-primary transition-colors truncate">
                              {a.object}
                            </span>
                            {a.description && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1 italic max-w-[200px]">
                                {a.description}
                              </p>
                            )}
                            {a.acknowledged && (
                              <span className="text-[10px] text-success font-bold uppercase flex items-center gap-1 mt-0.5">
                                <CheckCircle className="w-3 h-3" /> Verified
                              </span>
                            )}

                          </div>
                        </div>
                      </td>
                      <td className="p-5 text-sm font-mono font-bold text-primary/80">
                        {a.confidence}%
                      </td>
                      <td className="p-5 text-xs font-semibold text-muted-foreground/80">
                        Cam {a.camera?.slice(-6).toUpperCase() || "INT-0"}
                      </td>
                      {isAdmin && (
                        <td className="p-5">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <div className="w-4 h-4 rounded bg-secondary flex items-center justify-center"><UserIcon className="w-2.5 h-2.5" /></div>
                            {a.cameraOwner === user?.id ? "Local Ops" : `Node ${a.cameraOwner?.slice(-4)}`}
                          </div>
                        </td>
                      )}
                      <td className="p-5">
                        <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5", s.color, s.bg, s.border)}>
                          {a.severity}
                        </Badge>
                        <div className="mt-1.5 text-[9px] font-mono text-muted-foreground/60 uppercase tracking-tighter">
                          Rule: {a.ruleId !== "System" ? a.ruleId.slice(-6) : "AUTO-GEN"}
                        </div>
                      </td>
                      <td className="p-5 text-xs text-muted-foreground font-mono leading-relaxed">
                        {a.timestamp.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                        <br />
                        <span className="opacity-60">{a.timestamp.toLocaleTimeString(undefined, { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </td>
                      <td className="p-5 text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity duration-300">
                          <Link to={`/dashboard/alerts/${a.id}`}>
                            <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-primary hover:text-white transition-all"><Eye className="w-3.5 h-3.5" /></button>
                          </Link>
                          {isAdmin && !a.acknowledged && (
                            <button
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-secondary text-success hover:bg-success hover:text-white transition-all"
                              onClick={() => acknowledgeMutation.mutate(a.id)}
                              disabled={acknowledgeMutation.isPending}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-secondary text-destructive hover:bg-destructive hover:text-white transition-all"
                              onClick={() => deleteMutation.mutate(a.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-20 text-center text-muted-foreground font-medium">No alerts detected in current sector.</div>
            )}
          </motion.div>

          {/* Mobile Nexus cards */}
          <motion.div
            key="mobile-nexus"
            variants={itemVariants}
            className="md:hidden space-y-4"
          >
            {filtered.map((a: any, idx: number) => {
              const s = SEV_CONFIG[a.severity] || SEV_CONFIG.low;
              return (
                <motion.div
                  key={a.id || idx}
                  layout
                  className="glass-panel rounded-2xl p-5 border border-border/40 relative overflow-hidden"
                >
                  <div className={cn("absolute top-0 right-0 w-32 h-32 blur-[40px] opacity-10 rounded-full -mr-16 -mt-16", s.bg.replace("bg-", "bg-"))} />

                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full", s.color.replace("text-", "bg-"), a.severity === "critical" && "animate-pulse")} />
                      <span className="font-bold text-foreground capitalize">{a.object}</span>
                      <Badge variant="outline" className={cn("text-[9px] tracking-widest px-1.5 py-0", s.color, s.border, s.bg)}>{a.severity}</Badge>
                    </div>
                    {a.description && (
                      <p className="text-[10px] text-muted-foreground/80 mb-3 italic border-l-2 border-primary/20 pl-2 leading-relaxed">
                        {a.description}
                      </p>
                    )}
                    <span className="text-xs font-mono font-bold text-primary">{a.confidence}%</span>

                  </div>

                  <div className="flex flex-col gap-1 mb-5 text-xs text-muted-foreground relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="opacity-60 flex items-center gap-1.5 font-medium"><Camera className="w-3 h-3" /> Trace: Node {a.camera?.slice(-6).toUpperCase() || "SYS"}</span>
                      <span className="font-mono">{a.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="mt-1 text-[10px] uppercase font-bold tracking-tight opacity-50">Log ID: {a.id?.slice(0, 12)}...</div>
                  </div>

                  <div className="flex gap-2 relative z-10">
                    <Link to={`/dashboard/alerts/${a.id}`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full gap-2 font-bold h-9 rounded-xl"><Eye className="w-4 h-4" /> Trace Event</Button>
                    </Link>
                    {isAdmin && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-9 w-10 text-destructive rounded-xl hover:bg-destructive hover:text-white"
                        onClick={() => deleteMutation.mutate(a.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default Alerts;
