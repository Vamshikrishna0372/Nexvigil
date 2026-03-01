import { AlertTriangle, Camera, Clock, Shield, User, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const severityConfig: Record<string, any> = {
  critical: { color: "bg-destructive", textColor: "text-destructive", label: "Critical" },
  high: { color: "bg-warning", textColor: "text-warning", label: "High" },
  medium: { color: "bg-primary", textColor: "text-primary", label: "Medium" },
  low: { color: "bg-muted-foreground", textColor: "text-muted-foreground", label: "Low" },
};

const iconMap: Record<string, any> = { Person: User, Vehicle: Car, Weapon: AlertTriangle };

const IncidentTimeline = () => {
  const { isAdmin } = useAuth();
  const [severityFilter, setSeverityFilter] = useState("all");

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["incident-timeline", severityFilter],
    queryFn: async () => {
      const params: any = { limit: 50 };
      if (severityFilter !== "all") params.severity = severityFilter;
      const { data } = await api.alerts.list(params);
      const res = data as any;
      const list = res.data || res || [];
      return list.map((a: any) => ({
        id: a.id || a._id,
        object: a.object_detected,
        confidence: Math.round((a.confidence || 0) * 100),
        camera: a.camera_id,
        timestamp: new Date(a.created_at),
        severity: a.severity,
        cameraOwner: a.owner_id,
        ruleName: a.rule_name || "System Rule",
        screenshotPath: a.screenshot_path
      }));
    },
    refetchInterval: 10000
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Incident Timeline</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isAdmin ? "System-wide" : "Personal"} chronological event feed — {alerts.length} events
          </p>
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px] bg-secondary border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative">
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border/40" />
        {isLoading ? (
          <div className="space-y-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="relative flex gap-4 pl-0">
                <div className="relative z-10 shrink-0">
                  <Skeleton className="w-10 h-10 rounded-full border-2 border-background" />
                </div>
                <div className="glass-panel rounded-xl p-5 flex-1 border border-border/10">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-24" />
                          <Skeleton className="h-4 w-12 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                    </div>
                    <Skeleton className="w-full md:w-40 lg:w-48 aspect-video rounded-lg shrink-0" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground italic border border-dashed border-border/40 rounded-xl">No incidents found</div>
        ) : (
          <div className="space-y-4">
            {alerts.map((inc: any, i: number) => {
              const sev = severityConfig[inc.severity] || severityConfig.low;
              const Icon = iconMap[inc.object] || Shield;
              return (
                <motion.div
                  key={inc.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="relative flex gap-4 pl-0"
                >
                  <div className="relative z-10 shrink-0">
                    <div className={cn("w-10 h-10 rounded-full border-2 border-background flex items-center justify-center shadow-lg", sev.color)}>
                      <Icon className="w-5 h-5 text-background" />
                    </div>
                  </div>
                  <div className="glass-panel rounded-xl p-4 flex-1 hover:border-primary/20 transition-all duration-300 border border-border/10">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground uppercase tracking-widest">{inc.object}</span>
                            <Badge variant="outline" className={cn("border-current text-[9px] h-4", sev.textColor)}>{sev.label}</Badge>
                            <Badge variant="outline" className="border-primary/30 text-primary text-[9px] h-4">{inc.confidence}%</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0 font-mono">
                            <Clock className="w-3.5 h-3.5" />
                            {inc.timestamp.toLocaleString(undefined, {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            }).replace(',', ' |')}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" />ID: {inc.camera?.slice(-6)}</span>
                            {isAdmin && <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Owner: {inc.cameraOwner?.slice(-6)}</span>}
                          </div>
                          <div className="bg-white/5 border border-white/10 rounded px-2 py-1 inline-flex items-center gap-2">
                            <Shield className="w-3 h-3 text-primary/70" />
                            <span className="text-[10px] text-muted-foreground font-medium">Rule: {inc.ruleName}</span>
                          </div>
                        </div>
                      </div>

                      {inc.screenshotPath && (
                        <div className="w-full md:w-40 lg:w-48 aspect-video rounded-lg overflow-hidden border border-white/10 shadow-2xl shrink-0 group">
                          <img
                            src={api.media.getScreenshotUrl(inc.screenshotPath)}
                            alt="Incident Snapshot"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentTimeline;
