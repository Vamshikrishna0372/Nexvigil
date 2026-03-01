import { FileText, Camera, Clock, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";

const CameraLogs = () => {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [selectedCamera, setSelectedCamera] = useState("all");

  const { data: cameras = [] } = useQuery({
    queryKey: ["cameras-list-for-logs"],
    queryFn: async () => {
      const { data } = await api.cameras.list();
      return (data as any) || [];
    }
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["camera-logs", selectedCamera],
    queryFn: async () => {
      if (selectedCamera === "all") return [];
      const { data } = await api.cameras.logs(selectedCamera);
      return (data as any) || [];
    },
    enabled: selectedCamera !== "all",
    refetchInterval: 10000
  });

  const filtered = logs.filter((l: any) => {
    const matchSearch = l.details?.toLowerCase().includes(search.toLowerCase()) ||
      l.event_type?.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === "all" || l.severity === levelFilter;
    return matchSearch && matchLevel;
  });

  const levelColors: Record<string, string> = {
    info: "text-primary border-primary/30",
    warning: "text-warning border-warning/30",
    error: "text-destructive border-destructive/30",
    critical: "text-destructive border-destructive/50 bg-destructive/10",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Camera Logs</h1>
          <p className="text-muted-foreground mt-1 text-sm">System event log for your surveillance nodes</p>
        </div>
        <Select value={selectedCamera} onValueChange={setSelectedCamera}>
          <SelectTrigger className="w-[200px] bg-secondary border-border shrink-0">
            <Camera className="w-4 h-4 mr-2" /><SelectValue placeholder="Select Camera" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Select a Camera...</SelectItem>
            {cameras.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.camera_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[140px] bg-secondary border-border">
            <Filter className="w-4 h-4 mr-2" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden min-h-[400px] border border-border/10">
        {isLoading ? (
          <div className="divide-y divide-border/10">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-[180px] shrink-0 hidden sm:block" />
                <Skeleton className="h-5 w-20 rounded-full shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : selectedCamera === "all" ? (
          <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
            <Camera className="w-12 h-12 mb-3 opacity-20" />
            <p>Please select a camera to view its logs</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-muted-foreground text-center">
            <FileText className="w-12 h-12 mb-3 opacity-20" />
            <p>No logs found for this camera.</p>
            <p className="text-xs mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/10">
            {filtered.map((log: any) => (
              <div key={log.id} className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors">
                <span className="text-xs font-mono text-muted-foreground w-[180px] shrink-0 hidden sm:block">
                  {new Date(log.timestamp).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </span>
                <Badge variant="outline" className={`${levelColors[log.severity] || levelColors.info} text-[10px] w-20 justify-center shrink-0`}>
                  {log.severity || 'info'}
                </Badge>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{log.event_type}</span>
                  <span className="text-xs text-muted-foreground">{log.details}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraLogs;
