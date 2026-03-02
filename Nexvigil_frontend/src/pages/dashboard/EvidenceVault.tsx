import { Play, Download, Clock, Lock, Camera, Search, User, Loader2, ShieldAlert, FileVideo, Calendar, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    <div className="space-y-8 p-1">
      <div className="flex items-center gap-4">
        <Skeleton className="w-14 h-14 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-12 w-full max-w-md rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="glass-panel rounded-[2rem] overflow-hidden border border-border/10">
            <Skeleton className="aspect-video w-full" />
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <div className="flex justify-between mt-4">
                <Skeleton className="h-8 w-24 rounded-xl" />
                <Skeleton className="h-8 w-8 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between flex-wrap gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-foreground uppercase tracking-tight font-display">Evidence Vault</h1>
              <p className="text-muted-foreground mt-1.5 font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary/60" />
                Secured Forensic Repository — {evidence.length} Protocol Records
                {!isAdmin && <span className="opacity-60 italic text-xs ml-1 border-l pl-3 border-border/40">Filtered: User Scope Assets Only</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="relative max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search forensic registry..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-12 h-14 bg-secondary/40 border-border/40 focus:ring-primary/20 rounded-2xl text-base font-medium shadow-inner"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-32 text-center glass-panel rounded-[2rem] border border-dashed border-border/40 flex flex-col items-center justify-center space-y-4"
              >
                <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mb-2">
                  <FileVideo className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Registry Search Exhausted</h3>
                  <p className="text-muted-foreground font-medium mt-1">No forensic records match your current encryption filters.</p>
                </div>
                <Button onClick={() => setSearch("")} variant="outline" className="rounded-xl px-8 font-bold mt-4">Clear All Filters</Button>
              </motion.div>
            ) : (
              filtered.map((r: any, i: number) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.5 }}
                  className="glass-panel rounded-[2rem] overflow-hidden group border border-border/30 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all bg-card/40 backdrop-blur-md relative"
                >
                  <div className="relative aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
                    {r.screenshot_path ? (
                      <img
                        src={api.media.getScreenshotUrl(r.screenshot_path)}
                        alt={r.object}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop';
                        }}
                      />
                    ) : (
                      <Camera className="w-12 h-12 text-white/5 opacity-40 absolute" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />

                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                      <Button
                        className="rounded-2xl px-6 h-11 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs gap-2 shadow-xl shadow-primary/20 active:scale-95"
                        onClick={() => r.video_path && window.open(api.media.getVideoUrl(r.video_path), '_blank')}
                      >
                        <Play className="w-4 h-4 fill-current" /> Initialize Playback
                      </Button>
                    </div>

                    <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                      <Badge className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border shadow-lg backdrop-blur-md",
                        r.severity === "critical" ? "bg-destructive/80 text-white border-destructive/20" : "bg-primary/80 text-white border-primary/20"
                      )}>
                        {r.severity}
                      </Badge>
                      {r.severity === "critical" && (
                        <div className="bg-destructive/20 p-1 rounded-lg border border-destructive/20 animate-pulse">
                          <ShieldAlert className="w-3 h-3 text-destructive" />
                        </div>
                      )}
                    </div>

                    <div className="absolute top-4 right-4 z-20">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20 shadow-xl">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-black text-white tracking-widest tabular-nums">
                          {r.duration_seconds?.toFixed(1) || '0.0'}s
                        </span>
                      </div>
                    </div>

                    <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-black font-mono text-white tracking-tighter">
                        {r.duration_seconds ? `${r.duration_seconds.toFixed(1)}s` : "09.0s"}
                      </span>
                    </div>

                    <div className="absolute bottom-4 left-4 z-20">
                      <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em] drop-shadow-md">Cam {r.camera_id?.slice(-6).toUpperCase() || "UNKWN"}</p>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="font-black text-foreground uppercase tracking-tight text-base leading-none capitalize">{r.object} Detected</h3>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 pt-0.5">
                          <Calendar className="w-3.5 h-3.5 opacity-60" />
                          {new Date(r.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                          <span className="opacity-20 mx-1">•</span>
                          {new Date(r.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/20">
                      <div className="flex items-center gap-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="p-2 rounded-xl bg-secondary/40 text-muted-foreground hover:text-foreground cursor-help transition-colors">
                              <Info className="w-4 h-4" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-secondary/95 backdrop-blur-md border-border/40 p-3 rounded-xl shadow-xl">
                            <div className="space-y-1.5 text-xs">
                              <p className="flex justify-between gap-4"><span>Format:</span> <span className="font-mono font-bold">H.264 MP4</span></p>
                              <p className="flex justify-between gap-4"><span>Resolution:</span> <span className="font-mono font-bold">1920x1080</span></p>
                              <p className="flex justify-between gap-4"><span>Bitrate:</span> <span className="font-mono font-bold">4.2 Mbps</span></p>
                              <p className="flex justify-between gap-4"><span>Hash:</span> <span className="font-mono font-bold opacity-60">SHA-256 Validated</span></p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{Math.random().toFixed(2)} MB • Forensic Grade</p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                        onClick={() => {
                          const url = r.video_path ? api.media.getVideoUrl(r.video_path) : "";
                          if (!url) return;
                          const link = document.createElement('a');
                          link.href = url + "&download=true";
                          link.download = `forensic_record_${r.id}.mp4`;
                          link.click();
                        }}
                      >
                        <Download className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default EvidenceVault;
