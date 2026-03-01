import { Play, Download, Clock, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const Recordings = () => {
  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ["recordings-list"],
    queryFn: async () => {
      const { data } = await api.media.recordings();
      const list = (data as any)?.data || data || [];
      return Array.isArray(list) ? list : [];
    },
    refetchInterval: 30000
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recordings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Event-triggered video clips from all cameras</p>
        </div>
        <Link to="/dashboard/evidence">
          <Button variant="outline" size="sm" className="border-border/50 hover:bg-secondary">Evidence Vault</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass-panel rounded-xl overflow-hidden border border-border/10">
              <Skeleton className="aspect-video w-full" />
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : recordings.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 glass-panel rounded-xl border border-dashed border-border/40">
          <Video className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground">No recordings found</p>
          <p className="text-xs mt-1 opacity-60">Recordings will appear here after detection rules are triggered</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {recordings.map((r: any) => (
            <div key={r.id} className="glass-panel rounded-xl overflow-hidden group border border-border/10">
              <div className="relative aspect-video bg-secondary/50 flex items-center justify-center">
                <Play className="w-10 h-10 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Link to={`/dashboard/alerts/${r.id}`}>
                    <Button size="sm" className="gap-1"><Play className="w-4 h-4" /> Play</Button>
                  </Link>
                </div>
              </div>
              <div className="p-3 border-t border-border/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">{r.object}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(r.timestamp).toLocaleString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                  <a href={api.media.getVideoUrl(r.video_path)} download target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Download className="w-4 h-4" /></Button>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Recordings;
