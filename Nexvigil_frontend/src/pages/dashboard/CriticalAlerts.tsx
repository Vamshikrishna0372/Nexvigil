import { AlertTriangle, Camera, Clock, Eye, Shield, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const CriticalAlerts = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["critical-alerts-page"],
    queryFn: async () => {
      const { data } = await api.alerts.list({ severity: "critical", limit: 50 });
      const res = data as any;
      const list = res.data || res || [];
      return list.map((a: any) => ({
        id: a.id || a._id,
        object: a.object_detected,
        confidence: Math.round((a.confidence || 0) * 100),
        camera: a.camera_id,
        timestamp: new Date(a.created_at),
        acknowledged: !!a.is_acknowledged,
        severity: a.severity,
        ruleName: a.rule_name || (a.object_detected === "Person" ? "Security Breach" : "Critical Threat"),
        screenshotPath: a.screenshot_path
      }));
    },
    refetchInterval: 5000
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => api.alerts.acknowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["critical-alerts-page"] });
      toast({ title: "Alert Acknowledged" });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center threat-pulse shadow-[0_0_20px_rgba(239,68,68,0.3)]">
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Critical Alerts</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {alerts.filter((a: any) => !a.acknowledged).length} unacknowledged threats
            {!isAdmin && " — your alerts only"}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass-panel rounded-xl overflow-hidden border border-border/10">
                <div className="flex flex-col md:flex-row">
                  <div className="flex-1 p-5 space-y-6">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-4 h-4 rounded-full" />
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                    <div className="flex justify-between border-t border-border/10 pt-4">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="w-full md:w-64 aspect-video md:aspect-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="glass-panel rounded-xl p-12 text-center border-dashed border-2 border-white/5 border border-border/10">
            <Shield className="w-12 h-12 text-success/30 mx-auto mb-3" />
            <p className="text-muted-foreground italic">No critical alerts — system secure</p>
          </div>
        ) : (
          alerts.map((alert: any, i: number) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "glass-panel rounded-xl overflow-hidden border-l-4 transition-all duration-300 border border-border/10",
                !alert.acknowledged ? "border-l-destructive glow-destructive bg-destructive/5" : "border-l-muted opacity-80"
              )}
            >
              <div className="flex flex-col md:flex-row">
                <div className="flex-1 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2.5 h-2.5 rounded-full", !alert.acknowledged ? "bg-destructive animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-muted")} />
                      <span className="font-bold text-foreground uppercase tracking-widest text-sm">{alert.object}</span>
                      <Badge variant="outline" className="border-destructive/30 text-destructive text-[10px] h-4">CRITICAL</Badge>
                      <Badge variant="outline" className="border-primary/30 text-primary text-[10px] h-4">{alert.confidence}%</Badge>
                    </div>
                    {alert.acknowledged && <Badge variant="secondary" className="bg-success/20 text-success text-[10px] border-success/30">Resolved</Badge>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Camera Source</p>
                      <div className="flex items-center gap-1.5 text-xs text-foreground bg-white/5 rounded px-2 py-1 border border-white/10 w-fit">
                        <Camera className="w-3.5 h-3.5 text-primary/70" />
                        <span>ID: {alert.camera?.slice(-6)}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Triggered Rule</p>
                      <div className="flex items-center gap-1.5 text-xs text-foreground bg-white/5 rounded px-2 py-1 border border-white/10 w-fit">
                        <Shield className="w-3.5 h-3.5 text-primary/70" />
                        <span>{alert.ruleName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {alert.timestamp.toLocaleString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                      }).replace(',', ' |')}
                    </div>

                    <div className="flex gap-2">
                      {!alert.acknowledged && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-success hover:bg-success/10 gap-1.5 h-7 text-[10px] uppercase font-bold"
                          onClick={() => acknowledgeMutation.mutate(alert.id)}
                          disabled={acknowledgeMutation.isPending}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Resolve
                        </Button>
                      )}
                      <Link to={`/dashboard/alerts/${alert.id}`}>
                        <Button size="sm" variant="secondary" className="gap-1.5 h-7 text-[10px] uppercase font-bold">Details</Button>
                      </Link>
                    </div>
                  </div>
                </div>

                {alert.screenshotPath && (
                  <div className="w-full md:w-48 lg:w-64 aspect-video md:aspect-auto border-t md:border-t-0 md:border-l border-white/10 bg-black/40 overflow-hidden relative group">
                    <img
                      src={api.media.getScreenshotUrl(alert.screenshotPath)}
                      alt="Threat Snapshot"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[9px] text-white/70 font-mono bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">
                      <Eye className="w-3 h-3" /> SNAPSHOT
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default CriticalAlerts;
