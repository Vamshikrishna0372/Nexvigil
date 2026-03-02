import { useState } from "react";
import { Camera, AlertTriangle, Wifi, WifiOff, Eye, Activity, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

const HeaderLeft = () => {
  const { isAdmin, user } = useAuth();
  const { summary } = useDashboardData(isAdmin);

  // Fetch actual unacknowledged critical alerts for the list
  const { data: criticalAlerts = [] } = useQuery({
    queryKey: ["header-critical-alerts"],
    queryFn: async () => {
      const { data } = await api.alerts.list({ severity: "critical", acknowledged: false, limit: 5 });
      const res = data as any;
      return res.data || res || [];
    },
    refetchInterval: 10000
  });

  // Fetch actual cameras for the list
  const { data: cameras = [] } = useQuery({
    queryKey: ["header-cameras-list"],
    queryFn: async () => {
      const { data } = await api.cameras.list();
      const res = data as any;
      return res.data || res || [];
    },
    refetchInterval: 15000
  });

  const isAiOnline = summary.ai_status === "running";

  return (
    <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 h-full">
      {/* AI Engine Status */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-secondary/50 transition-all duration-300 cursor-default border border-transparent hover:border-border/40 group shrink-0">
            <div className="relative flex h-2.5 w-2.5 shrink-0">
              {isAiOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              )}
              <span className={cn(
                "relative inline-flex rounded-full h-2.5 w-2.5 shadow-sm transition-transform duration-500 group-hover:scale-110",
                isAiOnline ? "bg-success shadow-success/40" : "bg-destructive shadow-destructive/40"
              )} />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-card/95 backdrop-blur-md border-border/60 p-4 rounded-xl shadow-2xl space-y-2 min-w-[200px] z-[100]">
          <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-1">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">AI Engine Protocol</h4>
            <Badge variant="outline" className={cn("text-[9px] h-4", isAiOnline ? "text-success border-success/30" : "text-destructive border-destructive/30")}>
              {isAiOnline ? "Stable" : "Halted"}
            </Badge>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Status</span>
              <span className={cn("font-bold", isAiOnline ? "text-success" : "text-destructive")}>{isAiOnline ? "Running" : "Offline"}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Neural State</span>
              <span className="text-foreground font-bold">{summary.ai_status}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>

      <div className="h-4 w-px bg-border/40" />

      {/* Active Cameras Symbol */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Popover>
            <PopoverTrigger asChild>
              <button className="relative flex items-center justify-center h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-300 border border-transparent hover:border-border/40 group shrink-0">
                <Camera className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" />
                {summary.active_cameras > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-[8px] font-black text-white rounded-full flex items-center justify-center border border-background shadow-sm tabular-nums">
                    {summary.active_cameras}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-80 bg-card/95 backdrop-blur-md border-border/60 p-0 rounded-2xl shadow-2xl overflow-hidden z-[100]">
              <div className="p-4 border-b border-border/40 flex items-center justify-between bg-primary/5">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.15em] text-foreground">Sensor Network</h4>
                  <p className="text-[10px] text-muted-foreground font-bold">{summary.active_cameras} operational points</p>
                </div>
                <Link to="/dashboard/cameras">
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold border-primary/20 hover:bg-primary/10 text-primary">MANAGE NODES</Button>
                </Link>
              </div>
              <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-border/20">
                {cameras.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <Camera className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground italic">No sensor nodes configured</p>
                  </div>
                ) : cameras.map((cam: any) => (
                  <div key={cam.id || cam._id} className="group/item flex items-center justify-between px-4 py-3 hover:bg-primary/[0.03] transition-colors relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                        cam.health_status === "online" ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"
                      )}>
                        {cam.health_status === "online" ? <Wifi className="w-4 h-4 text-success" /> : <WifiOff className="w-4 h-4 text-destructive" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate group-hover/item:text-primary transition-colors">{cam.camera_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate uppercase opacity-60">ID: {cam.id?.slice(-8) || cam._id?.slice(-8)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        cam.status === "active" ? "bg-success animate-pulse" : "bg-muted"
                      )} />
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-tighter",
                        cam.status === "active" ? "text-success" : "text-muted-foreground"
                      )}>{cam.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </TooltipTrigger>
        <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">Active Sensor Nodes</TooltipContent>
      </Tooltip>

      <div className="h-4 w-px bg-border/40" />

      {/* Critical Alerts Symbol */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "relative flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-300 border group shrink-0",
                summary.critical_alerts > 0
                  ? "text-destructive border-destructive/20 bg-destructive/10 hover:bg-destructive/20 shadow-[0_0_15px_rgba(239,68,68,0.1)] threat-pulse"
                  : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/50 hover:border-border/40"
              )}>
                <AlertTriangle className={cn("w-[18px] h-[18px] transition-transform group-hover:scale-110", summary.critical_alerts > 0 && "animate-pulse")} />
                {summary.critical_alerts > 0 && (
                  <motion.span
                    key={summary.critical_alerts}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-destructive text-[9px] font-black text-white rounded-full flex items-center justify-center px-1 border border-background shadow-lg tabular-nums"
                  >
                    {summary.critical_alerts}
                  </motion.span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-[340px] bg-card/95 backdrop-blur-md border-border/60 p-0 rounded-2xl shadow-2xl overflow-hidden z-[100]">
              <div className="p-4 border-b border-border/40 bg-destructive/5">
                <h4 className="text-xs font-black uppercase tracking-[0.15em] text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> High-Priority Threats
                </h4>
                <p className="text-[10px] text-muted-foreground font-bold mt-0.5">{summary.critical_alerts} active unacknowledged incidents</p>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y divide-border/20">
                {criticalAlerts.length === 0 ? (
                  <div className="py-10 px-4 text-center">
                    <Shield className="w-10 h-10 text-success/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground italic">Perimeter secure — No critical alerts</p>
                  </div>
                ) : (
                  criticalAlerts.map((alert: any) => (
                    <div key={alert.id || alert._id} className="group/alert px-4 py-3 hover:bg-destructive/[0.03] transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-foreground uppercase tracking-tight group-hover/alert:text-destructive transition-colors">{alert.object_detected}</span>
                        <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap bg-secondary/50 px-1.5 rounded">{new Date(alert.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium truncate">
                          <Camera className="w-3 h-3 text-destructive/60" />
                          <span className="truncate">Node Trace: {alert.camera_id?.slice(-8).toUpperCase()}</span>
                        </div>
                        <Link to={`/dashboard/alerts/${alert.id || alert._id}`}>
                          <Button variant="ghost" size="sm" className="h-6 text-[9px] font-black uppercase tracking-widest gap-1 text-primary hover:bg-primary/10 px-2 rounded-lg"><Eye className="w-3 h-3" /> TRACE</Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 bg-secondary/20 border-t border-border/40">
                <Link to="/dashboard/alerts" className="block">
                  <Button variant="ghost" size="sm" className="w-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary/5">FULL INCIDENT REPOSITORY</Button>
                </Link>
              </div>
            </PopoverContent>
          </Popover>
        </TooltipTrigger>
        <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">Active Critical Incursions</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default HeaderLeft;
