import { Play, Download, Clock, Lock, Camera, Search, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

import { Skeleton } from "@/components/ui/skeleton";

const EvidenceVault = () => {
  const [search, setSearch] = useState("");
  const { user, isAdmin } = useAuth();

  const { data: evidence = [], isLoading } = useQuery({
    queryKey: ["evidence-vault"],
    queryFn: async () => {
      const { data } = await api.media.recordings();
      const list = (data as any)?.data || data || [];
      return Array.isArray(list) ? list : [];
    },
    refetchInterval: 30000
  });

  const filtered = evidence.filter((e: any) =>
    (e.object || "").toLowerCase().includes(search.toLowerCase()) ||
    (e.camera_id || "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="glass-panel rounded-xl overflow-hidden border border-border/10">
            <Skeleton className="aspect-video w-full rounded-t-xl" />
            <div className="p-3 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Evidence Vault</h1>
          <p className="text-muted-foreground mt-1">
            Secured event recordings — {evidence.length} clips
            {!isAdmin && " — your recordings only"}
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search evidence..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border">
            No recordings found.
          </div>
        ) : filtered.map((r: any, i: number) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            className="glass-panel rounded-xl overflow-hidden group"
          >
            <div className="relative aspect-video bg-secondary/50 flex items-center justify-center">
              <Play className="w-10 h-10 text-muted-foreground/30 group-hover:text-primary transition-colors" />
              <div className="absolute inset-0 bg-background/0 group-hover:bg-background/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Button size="sm" className="gap-1" onClick={() => r.video_path && window.open(api.media.getVideoUrl(r.video_path), '_blank')}>
                  <Play className="w-4 h-4" /> Play
                </Button>
              </div>
              <div className="absolute top-2 left-2 flex items-center gap-1.5">
                {r.severity === "critical" && (
                  <Badge variant="outline" className="bg-background/60 border-destructive/30 text-destructive text-[10px]">
                    <Lock className="w-2.5 h-2.5 mr-1" />Preserved
                  </Badge>
                )}
              </div>
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-background/70 rounded px-2 py-0.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-mono text-muted-foreground">00:30</span>
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground">Cam {r.camera_id?.slice(-4)}</p>
                    <Badge variant="outline" className={`text-[9px] ${r.severity === "critical" ? "text-destructive border-destructive/30" : "text-primary border-primary/30"}`}>
                      {r.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.object} • {new Date(r.timestamp).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  const url = r.video_path ? api.media.getVideoUrl(r.video_path) : "";
                  if (!url) return;
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `recording_${r.id}.mp4`;
                  link.click();
                }}><Download className="w-4 h-4" /></Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default EvidenceVault;
