import { HeartPulse, Wifi, WifiOff, Thermometer, HardDrive, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  online: { color: "text-success", bg: "bg-success/20", label: "Healthy" },
  offline: { color: "text-muted-foreground", bg: "bg-muted", label: "Offline" },
  active: { color: "text-success", bg: "bg-success/20", label: "Healthy" },
  inactive: { color: "text-muted-foreground", bg: "bg-muted", label: "Disabled" },
};

const CameraHealth = () => {
  const { isAdmin } = useAuth();

  const { data: cameras = [], isLoading } = useQuery({
    queryKey: ["cameras-health-page"],
    queryFn: async () => {
      const { data } = await api.cameras.list();
      const res = data as any;
      const list = res.data || res || [];
      return list.map((c: any) => ({
        id: c.id || c._id,
        name: c.camera_name,
        healthStatus: c.health_status || "offline",
        status: c.status,
        fps: c.fps || 15,
        lastActive: c.updated_at ? new Date(c.updated_at) : new Date(),
        owner: c.owner_id
      }));
    },
    refetchInterval: 10000
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
          <HeartPulse className="w-5 h-5 text-success" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Camera Health Status</h1>
          <p className="text-muted-foreground mt-1">
            {cameras.filter((c: any) => c.healthStatus === "online").length} healthy •{" "}
            {cameras.filter((c: any) => c.healthStatus !== "online").length} offline
            {!isAdmin && " — your cameras"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-panel rounded-xl p-5 border border-border/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="bg-secondary/30 rounded-lg p-3">
                    <Skeleton className="h-2 w-12 mb-2" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-8 w-full mt-4 rounded-md" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cameras.map((cam: any, i: number) => {
            const st = statusConfig[cam.healthStatus] || statusConfig.offline;
            const tel = cam.telemetry || {};
            const temp = tel.temperature || 0;
            const storage = tel.storage_gb || 0;
            const uptime = tel.uptime_pct || (cam.healthStatus === "online" ? 100 : 0);

            return (
              <motion.div
                key={cam.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-panel rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {cam.healthStatus === "online" ? <Wifi className={cn("w-5 h-5", st.color)} /> : <WifiOff className={cn("w-5 h-5", st.color)} />}
                    <div>
                      <p className="font-semibold text-foreground text-sm">{cam.name}</p>
                      {isAdmin && <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">Owner: {cam.owner?.slice(-6)}</p>}
                    </div>
                  </div>
                  <Badge variant="outline" className={cn(st.color, "border-current text-[10px]")}>{st.label}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">Uptime</p>
                    <p className="text-lg font-bold text-foreground tabular-nums">{uptime}%</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">FPS</p>
                    <p className="text-lg font-bold text-foreground tabular-nums">{cam.fps || 0}</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Thermometer className="w-3 h-3 text-muted-foreground" />
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Temp</p>
                    </div>
                    <p className={cn("text-lg font-bold tabular-nums", temp > 60 ? "text-destructive" : temp > 50 ? "text-warning" : "text-foreground")}>{temp}°C</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <HardDrive className="w-3 h-3 text-muted-foreground" />
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Recorded</p>
                    </div>
                    <p className="text-lg font-bold text-foreground tabular-nums">{storage} GB</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-4 text-[11px] text-muted-foreground bg-secondary/20 p-2 rounded-md">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-medium">Last active:</span>
                  <span className="font-mono">{cam.lastActive.toLocaleString(undefined, {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  }).replace(',', ' |')}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CameraHealth;
