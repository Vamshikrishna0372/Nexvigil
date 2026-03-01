import { useState } from "react";
import { Camera, AlertTriangle, Wifi, WifiOff, Eye, Activity } from "lucide-react";
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
    <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
      {/* AI Engine Status */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-secondary/50 transition-colors cursor-default">
            <span className="relative flex h-2 w-2 shrink-0">
              {isAiOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />}
              <span className={cn("relative inline-flex rounded-full h-2 w-2", isAiOnline ? "bg-success" : "bg-destructive")} />
            </span>
            <span className={cn("text-xs font-semibold hidden md:inline", isAiOnline ? "text-success" : "text-destructive")}>
              {isAiOnline ? "AI Online" : "AI Offline"}
            </span>
            {/* Mobile: just show icon */}
            <Activity className={cn("w-3.5 h-3.5 md:hidden", isAiOnline ? "text-success" : "text-destructive")} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-card border-border p-3 space-y-1.5">
          <p className="text-xs font-semibold text-foreground mb-2">{isAiOnline ? "AI Engine Running" : "AI Engine Offline"}</p>
          <p className="text-xs text-muted-foreground">Local Time: <span className="text-foreground font-mono">{new Date(summary.server_time).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span></p>
          <p className="text-xs text-muted-foreground">Status: <span className="text-foreground">{summary.ai_status}</span></p>
        </TooltipContent>
      </Tooltip>

      <div className="h-4 w-px bg-border/60 hidden sm:block" />

      {/* Active Cameras */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
            <Camera className="w-3.5 h-3.5" />
            <span className="font-medium">{summary.active_cameras}</span>
            <span className="hidden sm:inline">Active</span>
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-80 bg-card border-border p-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Camera Status</h4>
              <p className="text-xs text-muted-foreground">{summary.active_cameras} active cameras</p>
            </div>
            <Link to="/dashboard/cameras">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-primary">Manage</Button>
            </Link>
          </div>
          <div className="max-h-64 overflow-y-auto scrollbar-thin divide-y divide-border/30">
            {cameras.length === 0 ? (
              <p className="p-4 text-xs text-center text-muted-foreground">No cameras configured</p>
            ) : cameras.map((cam: any) => (
              <div key={cam.id || cam._id} className="flex items-center justify-between px-3 py-2.5 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  {cam.health_status === "online" ? <Wifi className="w-3.5 h-3.5 text-success shrink-0" /> : <WifiOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{cam.camera_name}</p>
                    {isAdmin && <p className="text-[10px] text-muted-foreground truncate">{cam.owner_id}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={cam.status === "active" ? "default" : "secondary"} className={cn("text-[9px] px-1.5", cam.status === "active" ? "bg-success/20 text-success border-success/30" : "")}>
                    {cam.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Critical Alerts */}
      <Popover>
        <PopoverTrigger asChild>
          <button className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors",
            summary.critical_alerts > 0
              ? "text-destructive hover:bg-destructive/10"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          )}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <AnimatePresence mode="wait">
              <motion.span
                key={summary.critical_alerts}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 8, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {summary.critical_alerts}
              </motion.span>
            </AnimatePresence>
            <span className="hidden sm:inline">Critical</span>
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-80 bg-card border-border p-0">
          <div className="p-3 border-b border-border">
            <h4 className="text-sm font-semibold text-destructive">Critical Alerts</h4>
            <p className="text-xs text-muted-foreground">{summary.critical_alerts} unacknowledged</p>
          </div>
          <div className="max-h-64 overflow-y-auto scrollbar-thin">
            {criticalAlerts.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No critical alerts</p>
            ) : (
              criticalAlerts.map((alert: any) => (
                <div key={alert.id || alert._id} className="px-3 py-2.5 border-b border-border/30 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{alert.object_detected}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(alert.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Camera className="w-3 h-3" /> Cam {alert.camera_id?.slice(-4)}</span>
                    <Link to={`/dashboard/alerts`}>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-primary"><Eye className="w-3 h-3" />View</Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-2 border-t border-border">
            <Link to="/dashboard/alerts" className="block">
              <Button variant="ghost" size="sm" className="w-full text-xs">View All Alerts</Button>
            </Link>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default HeaderLeft;
