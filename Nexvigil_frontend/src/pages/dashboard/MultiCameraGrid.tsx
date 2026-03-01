import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Camera, Wifi, WifiOff, Maximize2, Minimize2, User, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/services/api";

// ─── Reusable Individual Camera Card ──────────────────────────────────────────
const CameraGridCard = ({ cam, isAdmin }: { cam: any; isAdmin: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const streamUrl = `${API_BASE}/cameras/${cam.id}/stream`;

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
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "glass-panel rounded-xl overflow-hidden group border border-border/40 transition-all duration-300",
        isMinimized ? "h-14" : "aspect-video"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isMinimized ? (
        <div className="relative w-full h-full bg-black/90">
          {cam.status === "active" ? (
            <>
              {/* Native MJPEG Stream — NO REFRESH KEY NEEDED */}
              <img
                src={streamUrl}
                alt={cam.camera_name}
                className="w-full h-full object-contain"
                loading="lazy"
              />

              {/* Overlay HUD */}
              <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                <div className="flex items-center gap-1.5 bg-success/20 border border-success/40 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[9px] font-bold text-success uppercase">Live</span>
                </div>
                <Badge variant="outline" className="bg-black/40 border-white/10 text-[9px] text-white/70">
                  {cam.camera_name}
                </Badge>
              </div>

              {/* Single Centered Fullscreen Button on Hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 z-30">
                <Button
                  size="icon"
                  variant="secondary"
                  className="w-14 h-14 rounded-full bg-primary/80 hover:bg-primary text-white shadow-2xl scale-90 group-hover:scale-100 transition-transform"
                  onClick={toggleFullscreen}
                >
                  <Maximize2 className="w-6 h-6" />
                </Button>
              </div>

              {/* Bottom Info Bar */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-white/60 truncate max-w-[150px]">
                  ID: {cam.id.slice(-6)}
                </span>
                <div className="flex items-center gap-2">
                  <Wifi className="w-3 h-3 text-success" />
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/30">
              <WifiOff className="w-10 h-10 mb-2" />
              <p className="text-xs">{cam.camera_name} Offline</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between w-full h-full px-4 bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className={cn("w-2 h-2 rounded-full", cam.status === "active" ? "bg-success animate-pulse" : "bg-muted-foreground")} />
            <span className="text-sm font-medium text-foreground">{cam.camera_name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[10px] text-primary"
              onClick={() => setIsMinimized(false)}
            >
              RESTORE
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const MultiCameraGrid = () => {
  const { user, isAdmin } = useAuth();
  const [ownerFilter, setOwnerFilter] = useState("all");

  // Real Data: Cameras
  const { data: cameras = [] } = useQuery({
    queryKey: ["cameras-list-grid"],
    queryFn: async () => {
      const { data } = await api.cameras.list();
      const res = data as any;
      let cams: any[] = [];
      if (res && Array.isArray(res.data)) cams = res.data;
      else if (Array.isArray(data)) cams = data;
      return cams.map((c: any, i: number) => ({
        ...c,
        id: c.id || c._id || `cam-${i}`,
      }));
    },
    // Poll slowly for status changes, but stream is continuous
    refetchInterval: 15000
  });

  const displayCameras = isAdmin
    ? (ownerFilter === "all" ? cameras : cameras.filter((c: any) => c.owner_id === ownerFilter))
    : cameras.filter((c: any) => c.owner_id === user?.id);

  const uniqueOwners = Array.from(new Set(cameras.map((c: any) => c.owner_id))).map(id => ({ id }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Multi-Camera Grid</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-primary" />
            {displayCameras.filter((c: any) => c.status === "active").length}/{displayCameras.length} Active Feeds
          </p>
        </div>
        {isAdmin && uniqueOwners.length > 1 && (
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-[180px] bg-secondary border-border">
              <User className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {uniqueOwners.map(o => <SelectItem key={o.id} value={o.id}>User {o.id.slice(-6)}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Professional Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {displayCameras.length === 0 ? (
          <div className="col-span-full py-20 text-center glass-panel rounded-xl">
            <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground italic">No cameras assigned to view</p>
          </div>
        ) : (
          displayCameras.map((cam) => (
            <CameraGridCard key={cam.id} cam={cam} isAdmin={isAdmin} />
          ))
        )}
      </div>
    </div>
  );
};

export default MultiCameraGrid;
