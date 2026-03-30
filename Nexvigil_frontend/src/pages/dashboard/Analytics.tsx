import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Search, Filter, Calendar, Camera, AlertTriangle, Activity, TrendingUp, ShieldCheck, Brain, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";


const SEV_COLORS: Record<string, string> = {
  critical: "hsl(0, 72%, 51%)",
  high: "hsl(38, 92%, 50%)",
  medium: "hsl(216, 91%, 60%)",
  low: "hsl(215, 15%, 55%)",
};

const tooltipStyle = {
  backgroundColor: "hsl(216, 45%, 12%)",
  border: "1px solid hsl(216, 30%, 20%)",
  borderRadius: "8px",
  color: "hsl(210, 20%, 90%)",
  fontSize: "12px"
};

interface AnalyticsData {
  total_count: number;
  alerts_by_severity: Record<string, number>;
  alerts_by_day: Array<{ date: string; count: number; critical: number }>;
  alerts_by_camera: Array<{ camera_id: string; count: number }>;
  alerts_by_object: Array<{ object: string; count: number }>;
}

const Analytics = () => {
  const { isAdmin } = useAuth();
  const [days, setDays] = useState("0");
  const [cameraFilter, setCameraFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const queryClient = useQueryClient();
  
  // Fetch Analytics Data with filters
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["analytics-overview", days, cameraFilter, severityFilter],
    queryFn: async () => {
      const params: any = { days: parseInt(days) };
      if (cameraFilter !== "all") params.camera_id = cameraFilter;
      if (severityFilter !== "all") params.severity = severityFilter;

      const { data } = await api.analytics.detectionOverview(params);
      return (data as any)?.data || data;
    },
    refetchInterval: 30000
  });

  // NEW: Strategic AI Insights (Phase 3)
  const { data: aiInsights, isLoading: isAiLoading, isRefetching: isAiRefetching } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: async () => {
      const { data } = await api.analytics.aiInsights();
      return (data as any)?.data || data;
    },
    refetchInterval: 60000 // Automatically refresh every minute
  });


  const analytics = data;

  // Fetch Cameras for names
  const { data: camList = [] } = useQuery({
    queryKey: ["analytics-cameras"],
    queryFn: async () => {
      const { data } = await api.cameras.list();
      const res = data as any;
      return res?.data || data || [];
    }
  });

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 rounded-full" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[350px] lg:col-span-2 rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    </div>
  );

  const stats = [
    { label: "Total Detections", value: analytics?.total_count || 0, icon: Activity, color: "text-primary" },
    { label: "Critical", value: analytics?.alerts_by_severity?.critical || 0, icon: AlertTriangle, color: "text-destructive" },
    { label: "Cameras Active", value: camList.filter((c: any) => c.status === "active").length, icon: Camera, color: "text-success" },
    { label: "Safe Status", value: "Verified", icon: ShieldCheck, color: "text-primary" },
  ];

  const trendsData = analytics?.alerts_by_day?.map((d: any) => ({
    date: new Date(d.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
    detections: d.count
  })) || [];

  const pieData = Object.entries(analytics?.alerts_by_severity || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Number(value),
    color: SEV_COLORS[name] || SEV_COLORS.low
  })).filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics Insight</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            {isAdmin ? "Global Network" : "Private Node"} surveillance telemetry — Tracking {analytics?.total_count || 0} events
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[130px] h-9 bg-secondary border-border text-xs rounded-lg">
              <Calendar className="w-3.5 h-3.5 mr-2" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 3 Months</SelectItem>
              <SelectItem value="0">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Select value={cameraFilter} onValueChange={setCameraFilter}>
            <SelectTrigger className="w-[150px] h-9 bg-secondary border-border text-xs rounded-lg">
              <Camera className="w-3.5 h-3.5 mr-2" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cameras</SelectItem>
              {camList.map((c: any) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">{c.camera_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[130px] h-9 bg-secondary border-border text-xs rounded-lg">
              <Filter className="w-3.5 h-3.5 mr-2" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI STRATEGIC INSIGHTS BOX (Phase 3) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-2xl p-5 border-l-4 border-l-primary/60 bg-primary/5 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] -mr-32 -mt-32 rounded-full" />
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20 text-primary">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Strategic AI Intelligence</h2>
              <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">System Analytics — Active Trace</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 gap-2 text-[10px] uppercase font-bold tracking-tighter bg-secondary/50 hover:bg-primary hover:text-white transition-all"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["ai-insights"] })}
            disabled={isAiLoading || isAiRefetching}
          >
            {(isAiLoading || isAiRefetching) ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Refresh Intelligence
          </Button>
        </div>

        <div className="relative z-10 min-h-[80px]">
          {isAiLoading || isAiRefetching ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[40%]" />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
              <p className="text-sm leading-relaxed text-foreground/90 font-medium italic whitespace-pre-wrap">
                "{aiInsights?.insights || "Initializing strategic scan..."}"
              </p>
              
              <div className="mt-4 flex items-center flex-wrap gap-4 pt-4 border-t border-border/20">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold bg-secondary/80 border-border/50">
                    Sectors Scanned: {aiInsights?.alerts_analyzed || 0}
                  </Badge>
                </div>
                {aiInsights?.automation?.trigger && (
                  <div className="flex items-center gap-2 text-destructive animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Automated Countermeasure Active: {aiInsights.automation.reason}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>


      {/* Summary Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-4 rounded-xl border border-border/10 flex items-center gap-4"
          >
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-secondary/50", s.color.replace("text-", "bg-").replace("/", "/20"))}>
              <s.icon className={cn("w-5 h-5", s.color)} />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground tabular-nums">{s.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detection Trends */}
        <div className="glass-panel rounded-xl p-6 lg:col-span-2 border border-border/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Event Timeline
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono px-2">REAL-TIME DATA</Badge>
          </div>
          <div className="h-[300px] w-full">
            {trendsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendsData}>
                  <defs>
                    <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(175, 70%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(175, 70%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 30%, 15%)" vertical={false} />
                  <XAxis dataKey="date" stroke="hsl(215, 15%, 45%)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(215, 15%, 45%)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'hsl(175, 70%, 45%)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="detections" stroke="hsl(175, 70%, 45%)" strokeWidth={3} fill="url(#analyticsGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">No detection data in selected range.</div>
            )}
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="glass-panel rounded-xl p-6 border border-border/10">
          <h3 className="text-lg font-semibold text-foreground mb-6">Severity Matrix</h3>
          <div className="h-[250px] w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground italic text-sm">No severity data.</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}: <span className="text-foreground font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts by Camera */}
        <div className="glass-panel rounded-xl p-6 border border-border/10">
          <h3 className="text-lg font-semibold text-foreground mb-6">Camera Breakdown</h3>
          <div className="space-y-4 text-xs">
            {analytics?.alerts_by_camera && analytics.alerts_by_camera.length > 0 ? (
              analytics.alerts_by_camera.slice(0, 6).map((c) => {
                const cam = camList.find((ch: any) => ch.id === c.camera_id);
                const perc = (c.count / (analytics.total_count || 1)) * 100;
                return (
                  <div key={c.camera_id} className="space-y-1.5">
                    <div className="flex justify-between font-medium">
                      <span className="text-foreground truncate pr-4">{cam ? cam.camera_name : `Node ${c.camera_id.slice(-4)}`}</span>
                      <span className="text-primary">{c.count}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${perc}%` }}
                        className="h-full bg-primary"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground italic text-sm py-10">No camera data available.</p>
            )}
          </div>
        </div>

        {/* Leading Objects */}
        <div className="glass-panel rounded-xl p-6 border border-border/10">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Leading Identifiers
          </h3>
          <div className="h-[240px] w-full">
            {analytics?.alerts_by_object?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.alerts_by_object}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 30%, 15%)" vertical={false} />
                  <XAxis dataKey="object" stroke="hsl(215, 15%, 50%)" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(215, 15%, 50%)" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(216, 30%, 20%)', opacity: 0.4 }} />
                  <Bar dataKey="count" fill="hsl(175, 70%, 45%)" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground italic text-sm">No category data.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
