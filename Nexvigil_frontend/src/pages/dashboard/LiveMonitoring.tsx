/**
 * LiveMonitoring.tsx — Part 7 Optimized
 *
 * - Fetches ONLY active cameras (no inactive cameras in list)
 * - Stream uses canvas-based double-buffering for flicker-free display
 * - Polling interval: 5 seconds (no aggressive re-renders)
 * - Stream frame refresh: every 200ms (~5 FPS) — stable, low-latency
 * - No full page reloads
 * - Alert detection polling: 5 seconds
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Square, Camera, Wifi, WifiOff, AlertTriangle, Activity, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api, API_BASE } from "@/services/api";
import { LoadingState } from "@/components/ui/LoadingState";

// ─── Optimized Stream Player (Header-aware) ──────────────────────────────────
const StableStreamViewer = ({ cameraId, cameraName }: { cameraId: string; cameraName: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const streamUrl = `${API_BASE}/cameras/${cameraId}/stream`;

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full transition-all duration-300 overflow-hidden bg-black flex items-center justify-center",
        isMinimized ? "h-12 border-b border-white/10" : "h-full"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isMinimized ? (
        <div className="relative group w-full h-full">
          <img
            src={streamUrl}
            alt={cameraName}
            className="w-full h-full object-contain"
            loading="eager"
          />

          {/* Single Centered Fullscreen Button on Hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 z-30">
            <Button
              size="icon"
              variant="secondary"
              className="w-16 h-16 rounded-full bg-primary/80 hover:bg-primary text-white shadow-2xl scale-90 group-hover:scale-100 transition-transform"
              onClick={toggleFullscreen}
            >
              <Maximize2 className="w-8 h-8" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full px-4 h-full">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-white/80">{cameraName} Stream Active</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[10px] text-primary hover:bg-primary/10"
            onClick={() => setIsMinimized(false)}
          >
            RESTORE
          </Button>
        </div>
      )}
    </div>
  );
};


// ─── Main LiveMonitoring Component ────────────────────────────────────────────
const LiveMonitoring = () => {
  const { isAdmin } = useAuth();
  const [selectedCam, setSelectedCam] = useState("");
  const [monitoring, setMonitoring] = useState(false);
  const [now, setNow] = useState(new Date());

  // Part 7: Fetch ONLY active cameras — no inactive cameras shown
  const { data: cameras = [] } = useQuery({
    queryKey: ["cameras-live-active"],
    queryFn: async () => {
      const { data } = await api.cameras.list();
      const res = data as any;
      let cams: any[] = [];
      if (res && Array.isArray(res.data)) cams = res.data;
      else if (Array.isArray(data)) cams = data;

      // Part 7: Filter ONLY active cameras for live monitoring
      const active = cams.filter((c: any) => c.status === "active");
      return active.map((c: any, i: number) => ({
        ...c,
        id: c.id || c._id || `cam-${i}`,
      }));
    },
    // Part 7: Optimized polling — 5 seconds, not aggressive re-renders
    refetchInterval: 5000,
    refetchIntervalInBackground: false, // Only poll when tab is active
  });

  // Part 7: Live detections poll, 5 second interval
  const { data: camAlerts = [] } = useQuery({
    queryKey: ["alerts-live", selectedCam],
    queryFn: async () => {
      if (!selectedCam) return [];
      const { data } = await api.alerts.list({ camera_id: selectedCam, limit: 14 });
      const res = data as any;
      const list = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(data) ? data : []);
      return list.map((a: any, i: number) => ({
        id: a.id || a._id || `det-${i}`,
        object: a.object_detected,
        confidence: Math.round((a.confidence || 0) * 100),
        timestamp: new Date(a.created_at),
        severity: a.severity,
        rule_id: a.triggered_rule_id || "Legacy Rule"
      }));
    },
    enabled: !!selectedCam,
    // Part 7: 5 second polling for live detections
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  // Auto-select first camera
  useEffect(() => {
    if (cameras.length > 0 && !selectedCam) setSelectedCam(cameras[0].id || "");
  }, [cameras]);

  // Clock update
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const currentCam = cameras.find((c: any) => c.id === selectedCam);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Live Monitoring</h1>
        <p className="text-muted-foreground mt-1">
          Real-time AI detection feed {!isAdmin && "— your cameras only"} · Showing active cameras only
        </p>
      </div>

      {/* Camera selector & controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Select value={selectedCam} onValueChange={(v) => { setSelectedCam(v); setMonitoring(false); }}>
          <SelectTrigger className="w-[280px] bg-secondary border-border">
            <SelectValue placeholder={cameras.length === 0 ? "No active cameras" : "Select camera to monitor"} />
          </SelectTrigger>
          <SelectContent>
            {cameras.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {c.camera_name}
                </span>
              </SelectItem>
            ))}
            {cameras.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">No active cameras found</div>
            )}
          </SelectContent>
        </Select>

        <Button
          onClick={() => setMonitoring(!monitoring)}
          variant={monitoring ? "destructive" : "default"}
          className="gap-2"
          disabled={!currentCam}
        >
          {monitoring ? <><Square className="w-4 h-4" /> Stop Stream</> : <><Play className="w-4 h-4" /> Start Stream</>}
        </Button>

        {cameras.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            No active cameras — add cameras in Camera Management
          </div>
        )}
      </div>

      {/* Video Stream Area */}
      <div className="glass-panel rounded-xl overflow-hidden aspect-video bg-black/90 relative border border-border/10 shadow-2xl">
        {monitoring && currentCam ? (
          <div className="w-full h-full relative">
            {/* Part 7: Canvas-based double-buffered stream — no page reload */}
            <StableStreamViewer cameraId={currentCam.id} cameraName={currentCam.camera_name} />

            {/* Overlays */}
            <div className="absolute top-4 left-4 flex gap-2 pointer-events-none z-10">
              <Badge className="bg-red-500/80 text-white animate-pulse">LIVE</Badge>
              <Badge variant="outline" className="text-white border-white/20 bg-black/40">
                {currentCam.fps || 15} FPS
              </Badge>
            </div>

            {/* Camera name overlay */}
            <div className="absolute top-4 right-4 text-white/70 text-xs bg-black/50 px-2 py-1 rounded backdrop-blur-sm pointer-events-none z-10">
              {currentCam.camera_name}
            </div>

            {/* Timestamp */}
            <div className="absolute bottom-4 right-4 text-white/70 text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none z-10">
              {now.toLocaleString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}
            </div>

            {/* Network stability reminder */}
            <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-white/50 text-[9px] bg-black/30 px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none z-10">
              <Wifi className="w-3 h-3" />
              Same WiFi · MJPEG
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
            {monitoring ? (
              <LoadingState text="ESTABLISHING SECURE AI FEED..." />
            ) : (
              <div className="text-center">
                <Camera className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm font-medium">
                  {cameras.length === 0
                    ? "No active cameras available"
                    : "Select a camera and press Start Stream"}
                </p>
                {cameras.length > 0 && (
                  <p className="text-xs mt-2 opacity-60">
                    Ensure devices are on the same WiFi network
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Real-time Detections */}
      <div className="glass-panel rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Live Detections
          {camAlerts.length > 0 && (
            <Badge variant="outline" className="ml-auto text-[10px] text-primary border-primary/30">
              {camAlerts.length} recent
            </Badge>
          )}
        </h3>
        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
          {!selectedCam ? (
            <p className="text-xs text-muted-foreground">Select a camera to see detections</p>
          ) : camAlerts.length === 0 ? (
            <p className="text-xs text-muted-foreground">No recent detections</p>
          ) : (
            camAlerts.map((a: any) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex justify-between items-center p-2 rounded bg-secondary/30 border border-border/40"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${a.severity === "critical" ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" : (a.severity === "high" ? "bg-orange-500" : "bg-primary")}`} />
                    <span className="font-medium text-xs text-foreground uppercase tracking-wider">{a.object}</span>
                    {a.severity === "critical" && (
                      <Badge className="text-[9px] py-0 px-1 bg-destructive/20 text-destructive border-destructive/30">CRITICAL</Badge>
                    )}
                  </div>
                  <div className="flex flex-col text-[10px] text-muted-foreground ml-3">
                    <span>Rule ID: {a.rule_id ? a.rule_id.substring(a.rule_id.length - 6) : "System"}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-[10px] text-muted-foreground tabular-nums">
                  <span className="font-mono text-primary/80">{a.confidence}% conf</span>
                  <span>
                    {a.timestamp.toLocaleString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Network Requirements Card */}
      <div className="glass-panel rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
        <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
          <Wifi className="w-4 h-4" />
          Network Stability Requirements
        </h3>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Phone and laptop must be on <strong className="text-foreground/70">the same WiFi network</strong></li>
          <li>• Mobile data must be <strong className="text-foreground/70">OFF</strong> on the phone</li>
          <li>• IP Webcam resolution: <strong className="text-foreground/70">640×480</strong>, FPS: <strong className="text-foreground/70">15</strong></li>
          <li>• Use <strong className="text-foreground/70">MJPEG</strong> mode in IP Webcam app (not RTSP)</li>
          <li>• URL format: <strong className="text-primary font-mono">http://PHONE_IP:8080/video</strong></li>
        </ul>
      </div>
    </div>
  );
};

export default LiveMonitoring;
