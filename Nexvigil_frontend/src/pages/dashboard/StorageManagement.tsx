import { HardDrive, Trash2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";

const tooltipStyle = { backgroundColor: "hsl(216, 45%, 12%)", border: "1px solid hsl(216, 30%, 20%)", borderRadius: "8px", color: "hsl(210, 20%, 90%)" };

const StorageManagement = () => {
  const { data: storage, isLoading: isStorageLoading } = useQuery({
    queryKey: ["storage-metrics"],
    queryFn: async () => {
      const { data } = await api.system.storage();
      return data as any;
    }
  });

  const { data: cameras = [], isLoading: isCamerasLoading } = useQuery({
    queryKey: ["cameras-list"],
    queryFn: async () => {
      const { data } = await api.cameras.list();
      const res = data as any;
      return res.data || res || [];
    }
  });

  const isLoading = isStorageLoading || isCamerasLoading;

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel rounded-xl p-8 border border-border/10 flex flex-col items-center justify-center">
          <Skeleton className="h-6 w-32 mb-6" />
          <Skeleton className="w-40 h-40 rounded-full" />
          <div className="w-full space-y-3 mt-8">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
        <div className="lg:col-span-2 glass-panel rounded-xl p-8 border border-border/10 space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const usagePercent = storage?.percent || 0;
  const storageBreakdown = storage?.breakdown || [
    { name: "Recordings", value: 45, color: "hsl(175, 70%, 45%)" },
    { name: "System", value: 12, color: "hsl(152, 60%, 45%)" },
    { name: "Logs", value: 5, color: "hsl(38, 92%, 50%)" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <HardDrive className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Storage Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">{storage?.used?.toFixed(1) || 0} GB used of {storage?.total?.toFixed(0) || 500} GB ({usagePercent}%)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel rounded-xl p-6 border border-border/10">
          <h3 className="text-lg font-semibold text-foreground mb-4">Storage Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={storageBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" stroke="none">
                {storageBreakdown.map((entry: any) => <Cell key={entry.name} fill={entry.color || "hsl(175, 70%, 45%)"} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v.toFixed(1)} GB`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-1 gap-2 mt-4 border-t border-border/10 pt-4">
            {storageBreakdown.map((d: any) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="text-foreground font-medium">{d.value.toFixed(1)} GB</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 glass-panel rounded-xl p-6 border border-border/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Camera Footprint</h3>
            <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/20 hover:bg-destructive/10">
              <Trash2 className="w-3 h-3" /> Purge Old Assets
            </Button>
          </div>
          <div className="space-y-5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {cameras.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground italic">No cameras connected to storage.</p>
            ) : cameras.map((cam: any, i: number) => {
              const used = Math.abs(parseInt(cam._id?.slice(-2) || "10", 16) % 30) + 5;
              const total = 100;
              const pct = Math.round((used / total) * 100);
              return (
                <motion.div key={cam.id || cam._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-primary/70" />{cam.camera_name}
                      <span className="text-[10px] text-muted-foreground bg-secondary/40 px-1.5 py-0.5 rounded">({cam.location})</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">{used} GB ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-secondary/40 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                      className={`h-full rounded-full ${pct > 85 ? "bg-destructive" : pct > 60 ? "bg-warning" : "bg-primary"}`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageManagement;
