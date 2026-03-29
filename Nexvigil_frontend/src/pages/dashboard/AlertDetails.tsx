import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Trash2, Camera, Clock, Target, Shield, Video, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";

const AlertDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: alert, isLoading, error } = useQuery({
    queryKey: ["alert-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.alerts.get(id);
      return res.data as any; // Adjust type based on schema
    },
    enabled: !!id
  });

  const [hasVideoError, setHasVideoError] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => api.alerts.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts-list"] });
      toast({ title: "Incident record purged" });
      navigate("/dashboard/alerts");
    }
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async () => api.alerts.acknowledge(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-detail", id] });
      toast({ title: "Event Acknowledged", description: "The incident has been verified and logged." });
    }
  });

  if (isLoading) return <LoadingState text="FORENSIC CORE LOADING..." fullPage />;
  if (error || !alert) return <div className="p-8 text-center">Alert not found or access denied.</div>;

  const videoUrl = api.media.getVideoUrl(alert.video_path);
  const screenshotUrl = api.media.getScreenshotUrl(alert.screenshot_path);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/alerts">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-secondary/50 border-border/50 hover:border-primary/50 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Evidence Analysis</h1>
              <Badge variant="outline" className={cn(
                "text-[10px] uppercase font-bold tracking-widest px-2 py-0.5",
                alert.severity === "critical" ? "text-destructive border-destructive/30 bg-destructive/5" :
                  alert.severity === "high" ? "text-warning border-warning/30 bg-warning/5" : "text-primary border-primary/30 bg-primary/5"
              )}>
                {alert.severity}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-primary/60" /> Detailed forensic breakdown for Event ID: {String(alert.id || alert._id).slice(-12)}
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {!alert.is_acknowledged && (
              <Button
                variant="default"
                size="sm"
                className="gap-2 bg-success hover:bg-success/90 text-white font-bold px-4 rounded-xl"
                onClick={() => acknowledgeMutation.mutate()}
                disabled={acknowledgeMutation.isPending}
              >
                <CheckCircle className="w-4 h-4" /> Acknowledge
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive border-destructive/20 hover:bg-destructive hover:text-white font-bold rounded-xl"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4" /> Purge Record
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Media Evidence Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-2xl overflow-hidden bg-black/40 border border-border/40 shadow-2xl relative group">
            <div className="absolute top-4 left-4 z-20">
              <div className="flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Recorded Clip</span>
              </div>
            </div>
            <div className="aspect-video relative flex items-center justify-center bg-zinc-950">
              {(() => {
                if (alert.video_path && !hasVideoError) {
                  const pathWithoutQuery = alert.video_path.split('?')[0];
                  const ext = pathWithoutQuery.split('.').pop()?.toLowerCase();
                  if (ext === 'mp4' || ext === 'webm') {
                    return (
                      <video
                        controls
                        muted
                        playsInline
                        className="w-full h-full object-contain"
                        autoPlay={false}
                        preload="auto"
                        onError={(e) => {
                          console.error("Video load error:", e);
                          setHasVideoError(true);
                        }}
                      >
                        <source src={videoUrl} type={`video/${ext === 'mp4' ? 'mp4' : 'webm'}`} />
                        Your browser does not support the video tag.
                      </video>
                    );
                  }
                }
                return (
                  <div className="text-center text-muted-foreground/40 p-12">
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-bold">Evidence Stream Unavailable</p>
                    <p className="text-xs opacity-60 mt-1 max-w-[200px] mx-auto">
                        {hasVideoError ? "The video file format is unsupported or the link is severed." : "Temporal buffer not found for this event."}
                    </p>
                    {hasVideoError && (
                        <Button 
                            variant="link" 
                            size="sm" 
                            className="mt-4 text-primary"
                            onClick={() => window.open(videoUrl, '_blank')}
                        >
                            Open raw media in new tab
                        </Button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {alert.screenshot_path && (
            <div className="glass-panel rounded-2xl p-6 border border-border/40">
              <div className="flex justify-between items-center mb-5">
                <h4 className="text-sm font-bold flex items-center gap-2.5 text-foreground uppercase tracking-tight">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Camera className="w-4 h-4" /></div>
                  High-Resolution Capture
                </h4>
                <a href={screenshotUrl} download target="_blank" rel="noreferrer">
                  <Button variant="secondary" size="sm" className="h-8 gap-2 text-xs font-bold rounded-lg border border-border/50"><Download className="w-3.5 h-3.5" /> Download</Button>
                </a>
              </div>
              <div className="relative rounded-xl overflow-hidden border border-border/50 bg-black/40 aspect-video flex items-center justify-center">
                <img
                  src={screenshotUrl}
                  alt="Detection Bounding Box"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/1280x720/18181b/a1a1aa?text=Frame+Capture+Unavailable';
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Metadata Sidebar */}
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-border/40 space-y-6">
            <h3 className="font-bold text-foreground flex items-center gap-2.5 uppercase tracking-tight text-sm">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Target className="w-4 h-4" /></div>
              Detection Registry
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-border/30 pb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Class</span>
                <span className="text-sm font-bold capitalize text-primary">{alert.object_detected}</span>
              </div>
              <div className="flex justify-between border-b border-border/30 pb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Protocol</span>
                <span className="text-sm font-bold text-foreground">{alert.rule_name || "Standard Detection"}</span>
              </div>
              <div className="flex justify-between border-b border-border/30 pb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Confidence</span>
                <span className="text-sm font-mono font-bold text-foreground">{(alert.confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between border-b border-border/30 pb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sensor ID</span>
                <span className="text-sm font-bold uppercase text-foreground">CAM {alert.camera_id?.slice(-6) || "INT-0"}</span>
              </div>
              <div className="flex justify-between border-b border-border/30 pb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">UTC Timestamp</span>
                <span className="text-sm font-mono font-bold text-foreground">
                  {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/30 pb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Clip Duration</span>
                <span className="text-sm font-mono font-bold text-primary">{alert.duration_seconds?.toFixed(1) || '0.0'}s</span>
              </div>
              <div className="flex justify-between items-center opacity-60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hash</span>
                <span className="text-[10px] font-mono select-all underline decoration-dotted underline-offset-2">{alert.id || alert._id}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-border/40">
            <h3 className="font-bold text-foreground mb-6 flex items-center gap-2.5 uppercase tracking-tight text-sm">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500"><Clock className="w-4 h-4" /></div>
              Activity Chain
            </h3>
            <div className="relative border-l-2 border-primary/20 ml-4 space-y-8 pl-6">
              <div className="relative">
                <span className="absolute -left-[31px] top-0.5 h-4 w-4 rounded-full bg-primary/20 border-2 border-primary ring-4 ring-background z-10" />
                <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mb-1">
                  {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm font-bold text-foreground">Event Initialized</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Rule engine triggered detection lifecycle.</p>
              </div>

              {alert.is_acknowledged ? (
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 h-4 w-4 rounded-full bg-success/20 border-2 border-success ring-4 ring-background z-10" />
                  <p className="text-[10px] font-bold text-success/60 uppercase tracking-widest mb-1">
                    {new Date(alert.acknowledged_at || alert.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm font-bold text-foreground">Verified & Logged</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Confirmed by system administrator.</p>
                </div>
              ) : (
                <div className="relative opacity-40">
                  <span className="absolute -left-[31px] top-0.5 h-4 w-4 rounded-full bg-secondary border-2 border-muted-foreground/40 ring-4 ring-background z-10" />
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">Pending</p>
                  <p className="text-sm font-bold text-muted-foreground">Verification Required</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AlertDetails;
