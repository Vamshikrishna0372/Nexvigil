import { Play, Clock, ShieldAlert, Search, Filter, Calendar, FileVideo, Download, MoreVertical, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

const Recordings = () => {
  const [search, setSearch] = useState("");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["recordings-list"],
    queryFn: async () => {
      const { data } = await api.media.recordings();
      const list = (data as any)?.data || data || [];
      return Array.isArray(list) ? list : [];
    },
    refetchInterval: 15000
  });

  const filtered = records.filter((r: any) =>
    (r.object || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.camera_id || "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-[1.5rem]" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 rounded-full" />
        </div>
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-14 flex-1 rounded-2xl" />
        <Skeleton className="h-14 w-32 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="glass-panel h-80 rounded-[2.5rem] border border-border/10 overflow-hidden">
            <Skeleton className="h-full w-full" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between flex-wrap gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <Video className="w-8 h-8 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-foreground uppercase tracking-tight font-display">Active Ingestion</h1>
            <p className="text-muted-foreground mt-1.5 font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500/60" />
              Event-triggered forensic capture — {records.length} Active Segments Recorded
            </p>
          </div>
        </div>
        <Link to="/dashboard/evidence">
          <Button variant="outline" className="h-12 border-border/60 rounded-xl px-6 font-black uppercase tracking-widest text-[10px] gap-2 hover:bg-secondary transition-all">
            <ShieldAlert className="w-3.5 h-3.5" /> Open Evidence Repository
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search ingestion stream by object or signature..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-12 h-14 bg-secondary/40 border-border/40 focus:ring-primary/20 rounded-2xl text-base font-medium"
          />
        </div>
        <Button variant="outline" className="h-14 px-6 rounded-2xl font-bold gap-2 border-border/40 hover:bg-secondary/60">
          <Filter className="w-4 h-4" /> Filter Matrix
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {filtered.map((r: any, i: number) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel group rounded-[2.5rem] overflow-hidden border border-border/30 hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all bg-card/40 backdrop-blur-md flex flex-col"
            >
              <div className="relative aspect-video bg-black/40 overflow-hidden">
                {r.screenshot_path ? (
                  <img
                    src={api.media.getScreenshotUrl(r.screenshot_path)}
                    alt={r.object}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop';
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="w-12 h-12 text-white/10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60" />

                <div className="absolute top-4 left-4 z-10">
                  <Badge className={cn(
                    "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-lg backdrop-blur-md",
                    r.severity === "critical" ? "bg-red-500/80 text-white border-red-500/20" : "bg-indigo-500/80 text-white border-indigo-500/20"
                  )}>
                    {r.severity}
                  </Badge>
                </div>

                <div className="absolute top-4 right-4 z-10 flex gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-2.5 py-1 border border-white/10 items-center">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] font-black text-white/90 uppercase tracking-widest tabular-nums font-mono">
                    {r.duration_seconds?.toFixed(1) || '0.0'}s
                  </span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 z-20">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        className="rounded-full w-14 h-14 bg-indigo-500 text-white shadow-xl shadow-indigo-500/30 active:scale-95"
                      >
                        <Play className="w-6 h-6 fill-current ml-1" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none rounded-[2rem]">
                      <div className="aspect-video w-full bg-black flex items-center justify-center relative">
                         <video 
                           controls 
                           autoPlay 
                           className="w-full h-full object-contain"
                           src={api.media.getVideoUrl(r.video_path)}
                         >
                           Your browser does not support the video tag.
                         </video>
                         <div className="absolute top-4 left-4 z-50">
                            <Badge className="bg-indigo-500/80 backdrop-blur-md uppercase tracking-widest text-[10px] py-1 px-3">
                               Forensic Segment: {r.id?.slice(0,8)}
                            </Badge>
                         </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="absolute bottom-4 left-4 z-10">
                  <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em]">NODE_{r.camera_id?.slice(-4).toUpperCase() || "UNIT"}</p>
                </div>

                <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] font-black font-mono text-white tracking-widest">
                    {r.duration_seconds ? `${r.duration_seconds.toFixed(1)}s` : "09.0s"}
                  </span>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl font-black text-foreground uppercase tracking-tight leading-tight truncate">{r.object} Alert</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-bold">
                    <Calendar className="w-3.5 h-3.5 opacity-60" />
                    {format(new Date(r.timestamp), "MMM dd, yyyy • HH:mm:ss")}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/20 flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Seg. Hash</span>
                    <span className="text-xs font-black text-foreground font-mono">#{r.id?.slice(0, 6)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Status</span>
                    <span className="text-xs font-black text-emerald-500">Captured</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all"
                    onClick={() => {
                      const url = r.video_path ? api.media.getVideoUrl(r.video_path) : "";
                      if (!url) return;
                      const link = document.createElement('a');
                      link.href = url + "&download=true";
                      link.download = `ingestion_segment_${r.id}.mp4`;
                      link.click();
                    }}
                  >
                    <Download className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="col-span-full py-32 text-center glass-panel rounded-[3rem] border border-dashed border-border/40 flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-secondary/20 flex items-center justify-center mb-6">
              <FileVideo className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">No Active Segments</h3>
            <p className="text-muted-foreground font-medium mt-2 max-w-xs mx-auto">The surveillance grid is currently in standby mode. Waiting for rule-triggered captures...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recordings;
