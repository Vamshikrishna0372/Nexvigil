import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, Wifi, WifiOff, User, Loader2, Eye, RefreshCw, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, API_BASE } from "@/services/api";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { Skeleton } from "@/components/ui/skeleton";

// Helper component for live stream — uses native browser MJPEG rendering via <img>
const LiveStreamView = ({ cameraId }: { cameraId: string }) => {
  const [status, setStatus] = useState<"loading" | "live" | "error">("loading");
  const imgRef = useRef<HTMLImageElement>(null);
  const streamUrl = `${API_BASE}/cameras/${cameraId}/stream?_=${cameraId}`;

  // When cameraId changes, reset to loading
  useEffect(() => {
    setStatus("loading");
  }, [cameraId]);

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center relative border border-border/20 shadow-2xl">
      {/* Native MJPEG stream — the browser handles multipart/x-mixed-replace natively */}
      <img
        ref={imgRef}
        src={streamUrl}
        alt="Live Feed"
        className="w-full h-full object-contain"
        onLoad={() => setStatus("live")}
        onError={() => setStatus("error")}
        // crossOrigin is needed if API is on a different port
        crossOrigin="anonymous"
      />

      {/* Connecting overlay */}
      {status === "loading" && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center pointer-events-none">
          <LoadingState text="INITIALIZING AI CAMERA..." className="scale-75" />
        </div>
      )}

      {/* Error overlay */}
      {status === "error" && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white text-sm gap-2 pointer-events-none p-6 text-center">
          <WifiOff className="w-10 h-10 text-destructive mb-2" />
          <span className="font-bold uppercase tracking-widest text-destructive">Signal Lost</span>
          <span className="text-xs text-muted-foreground max-w-[200px]">Node synchronization failed. Ensure AI Agent process is active and camera source is reachable.</span>
        </div>
      )}
    </div>
  );
};


const Cameras = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewCam, setViewCam] = useState<{ id: string; name: string } | null>(null);
  const [editCam, setEditCam] = useState<{ id: string; name: string; location: string; url: string } | null>(null);
  const [form, setForm] = useState({ name: "", url: "", location: "" });

  const { data: cameras = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["cameras-list"],
    queryFn: async () => {
      try {
        const { data, error } = await api.cameras.list();
        if (error) throw new Error(error);

        // api.ts already unwraps response.data
        let cams: any[] = [];
        if (Array.isArray(data)) cams = data;
        else {
          const res = data as any;
          if (res && Array.isArray(res.data)) cams = res.data;
        }

        // Normalize: ensure each cam has `id` (MongoDB returns _id)
        return cams.map((cam: any) => ({
          ...cam,
          id: cam.id || cam._id || "",
        }));
      } catch (e) {
        console.error("Failed to fetch cameras", e);
        return [];
      }
    },
    refetchInterval: 12000 // Aligning with the new dashboard polling strategy
  });

  const addMutation = useMutation({
    mutationFn: async (cam: any) => {
      const { data, error } = await api.cameras.create({ camera_name: cam.name, camera_url: cam.url, location: cam.location });
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cameras-list"] });
      setAddOpen(false);
      setForm({ name: "", url: "", location: "" });
      toast({ title: "Camera added successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to add camera", description: err.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (cam: any) => api.cameras.update(cam.id, { camera_name: cam.name, location: cam.location, camera_url: cam.url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cameras-list"] });
      setEditOpen(false);
      setEditCam(null);
      toast({ title: "Camera updated successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update camera", description: err.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.cameras.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cameras-list"] });
      toast({ title: "Camera deleted", variant: "destructive" });
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => api.cameras.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cameras-list"] });
      toast({ title: "Camera status updated" });
    }
  });

  // Part 1: Normalize phone IP camera URL (mirrors backend logic)
  const normalizeUrl = (url: string): string => {
    if (!url || /^\d+$/.test(url)) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const stripped = url.replace(/\/+$/, "");
      try {
        const parsed = new URL(stripped);
        if (!parsed.pathname || parsed.pathname === "/") {
          return stripped + "/video";
        }
        if (!parsed.pathname.endsWith("/video")) {
          return stripped + "/video";
        }
      } catch { }
    }
    return url;
  };

  const handleAdd = () => {
    if (!form.name || !form.location || !form.url) { toast({ title: "Please fill all fields", variant: "destructive" }); return; }

    // Validation
    const isNumeric = /^\d+$/.test(form.url);
    const isValidUrl = form.url.startsWith("rtsp://") || form.url.startsWith("http://") || form.url.startsWith("https://");

    if (isNumeric) {
      if (parseInt(form.url) < 0) {
        toast({ title: "Invalid Device Index", description: "Must be a non-negative number (0 = laptop cam).", variant: "destructive" });
        return;
      }
    } else if (!isValidUrl) {
      toast({ title: "Invalid Source", description: "Enter a device index (0, 1) or a URL starting with rtsp://, http://, https://", variant: "destructive" });
      return;
    }

    // Auto-normalize URL before submitting (backend also normalizes, but be transparent)
    const normalizedUrl = normalizeUrl(form.url);
    const finalForm = { ...form, url: normalizedUrl };

    if (normalizedUrl !== form.url) {
      toast({ title: "URL Auto-Corrected", description: `Using: ${normalizedUrl}` });
    }

    addMutation.mutate(finalForm);
  };

  const handleEdit = () => {
    if (!editCam) return;
    updateMutation.mutate(editCam);
  };

  if (isLoading) return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="glass-panel p-4 flex items-center justify-between gap-4 border border-border/10 rounded-xl">
          <div className="flex items-center gap-4">
            <Skeleton className="w-5 h-5 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex gap-2">
            {[...Array(4)].map((_, j) => <Skeleton key={j} className="h-8 w-8 rounded-md" />)}
          </div>
        </div>
      ))}
    </div>
  );

  const displayCameras = cameras;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Camera Management</h1>
          <p className="text-muted-foreground mt-1">
            {displayCameras.length} cameras {isAdmin ? "(System Wide)" : "(Your Cameras)"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const { data } = await refetch();
              if (data) toast({ title: "Cameras refreshed" });
            }}
            disabled={isRefetching}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
            {isRefetching ? "Refreshing..." : "Refresh"}
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Add Camera</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Add New Camera</DialogTitle>
                <DialogDescription>Add a new camera to your surveillance system.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Camera Name</Label>
                  <Input placeholder="e.g., Server Room" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border" />
                </div>
                <div className="space-y-2">
                  <Label>Camera Source</Label>
                  <Input
                    placeholder="0 (laptop) · 1 (USB) · http://IP:8080/video · rtsp://..."
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    className="bg-secondary border-border"
                  />
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground">Device index: <span className="text-foreground/60 font-mono">0</span> (laptop), <span className="text-foreground/60 font-mono">1</span> (USB cam)</p>
                    <p className="text-[10px] text-primary/80 font-medium">📱 For IP Webcam app: <span className="font-mono">http://IP:8080/video</span></p>
                    <p className="text-[10px] text-muted-foreground">Bare URLs like <span className="font-mono">http://IP:8080</span> will be auto-corrected to add <span className="font-mono">/video</span></p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input placeholder="Building B" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-secondary border-border" />
                </div>
                <Button onClick={handleAdd} disabled={addMutation.isPending} className="w-full">
                  {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Camera"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Dialog open={!!viewCam} onOpenChange={(o) => !o && setViewCam(null)}>
        <DialogContent className="bg-card border-border sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewCam?.name} - Live Feed</DialogTitle>
            <DialogDescription>Real-time surveillance stream (via AI Agent).</DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            {viewCam && <LiveStreamView cameraId={viewCam.id} />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Camera</DialogTitle>
            <DialogDescription>Update camera details.</DialogDescription>
          </DialogHeader>
          {editCam && (
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Camera Name</Label>
                <Input value={editCam.name} onChange={(e) => setEditCam({ ...editCam, name: e.target.value })} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>RTSP URL</Label>
                <Input value={editCam.url} onChange={(e) => setEditCam({ ...editCam, url: e.target.value })} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={editCam.location} onChange={(e) => setEditCam({ ...editCam, location: e.target.value })} className="bg-secondary border-border" />
              </div>
              <Button onClick={handleEdit} disabled={updateMutation.isPending} className="w-full">Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {displayCameras.length === 0 ? <p className="text-muted-foreground text-center py-12">No cameras found.</p> : displayCameras.map((cam: any, i: number) => (
          <motion.div
            key={cam.id || `cam-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass-panel rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              {cam.status === "active" ? <Wifi className="w-5 h-5 text-success shrink-0" /> : <WifiOff className="w-5 h-5 text-muted-foreground shrink-0" />}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{cam.camera_name}</span>
                  <Badge variant={cam.status === "active" ? "default" : "secondary"} className={cam.status === "active" ? "bg-success/20 text-success border-success/30 text-[10px]" : "text-[10px]"}>
                    {cam.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{cam.location}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {isAdmin && <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" />{cam.owner_id ? "User " + cam.owner_id.slice(-4) : "System"}</p>}
                  <p className="text-xs text-muted-foreground">ID: {(cam.id || "").slice(-6)}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={cam.status === "active"}
                onCheckedChange={(checked) => toggleStatusMutation.mutate({ id: cam.id, status: checked ? "active" : "inactive" })}
              />
              <Button variant="ghost" size="sm" onClick={() => setViewCam({ id: cam.id, name: cam.camera_name })} className="text-primary hover:text-primary/90">
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditCam({ id: cam.id, name: cam.camera_name, location: cam.location, url: cam.camera_url }); setEditOpen(true); }}>
                <Edit className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Camera</AlertDialogTitle>
                    <AlertDialogDescription>Are you sure you want to delete "{cam.camera_name}"?</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMutation.mutate(cam.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Cameras;
