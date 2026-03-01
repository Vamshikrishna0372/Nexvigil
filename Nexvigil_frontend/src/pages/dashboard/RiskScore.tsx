import { Gauge, TrendingUp, TrendingDown, Shield, Camera } from "lucide-react";
import { ResponsiveContainer, RadialBarChart, RadialBar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";

const tooltipStyle = { backgroundColor: "hsl(216, 45%, 12%)", border: "1px solid hsl(216, 30%, 20%)", borderRadius: "8px", color: "hsl(210, 20%, 90%)" };

const RiskScore = () => {
  const { isAdmin } = useAuth();

  const { data: riskData, isLoading: riskLoading } = useQuery({
    queryKey: ["risk-score-page"],
    queryFn: async () => {
      const { data } = await api.analytics.riskScore();
      return data as any;
    },
    refetchInterval: 10000
  });

  const { data: riskTrends = [], isLoading: trendsLoading } = useQuery({
    queryKey: ["risk-trends"],
    queryFn: async () => {
      const { data } = await api.analytics.trends("risk", 14);
      return (data as any[]) || [];
    }
  });

  const { data: cameras = [] } = useQuery({
    queryKey: ["risk-cameras-list"],
    queryFn: async () => {
      const { data } = await api.cameras.list();
      return (data as any[]) || [];
    }
  });

  const isLoading = riskLoading || trendsLoading;

  if (isLoading) return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 rounded-full" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel rounded-xl p-8 flex flex-col items-center justify-center border border-border/10">
          <Skeleton className="h-4 w-32 mb-6" />
          <Skeleton className="w-40 h-40 rounded-full" />
          <Skeleton className="h-6 w-24 mt-6" />
        </div>
        <div className="lg:col-span-2 glass-panel rounded-xl p-6 border border-border/10">
          <Skeleton className="h-6 w-48 mb-6" />
          <Skeleton className="h-[240px] w-full" />
        </div>
      </div>
      <div className="glass-panel rounded-xl p-6 border border-border/10 space-y-4">
        <Skeleton className="h-6 w-48 mb-4" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 flex-1 rounded-full" />
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>
    </div>
  );

  const displayRisk = riskData?.risk_score || 0;
  const radialData = [{ name: "Risk", value: displayRisk, fill: displayRisk > 70 ? "hsl(0, 72%, 51%)" : displayRisk > 40 ? "hsl(38, 92%, 50%)" : "hsl(152, 60%, 45%)" }];

  const trends = riskTrends.map((t: any) => ({
    day: new Date(t.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
    score: t.value
  }));

  const zoneRisks = cameras.map(c => ({
    zone: c.camera_name,
    score: c.health_status === "online" ? 20 : 80,
    trend: c.health_status === "online" ? "down" as const : "up" as const,
    cameras: 1,
  })).sort((a, b) => b.score - a.score).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Risk Score Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">{isAdmin ? "System-wide" : "Personal"} threat assessment — 0 (safe) to 100 (critical)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel rounded-xl p-6 border border-border/10 flex flex-col items-center justify-center">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{isAdmin ? "Overall" : "Personal"} Risk Score</h3>
          <div className="relative">
            <ResponsiveContainer width={200} height={200}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="90%" data={radialData} startAngle={180} endAngle={0}>
                <RadialBar background dataKey="value" cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center -mt-6">
              <div className="text-center">
                <span className={`text-5xl font-black ${displayRisk > 70 ? "text-destructive" : displayRisk > 40 ? "text-warning" : "text-success"}`}>{displayRisk}</span>
                <p className="text-xs text-muted-foreground mt-1">/ 100</p>
              </div>
            </div>
          </div>
          <p className={`text-sm font-semibold mt-2 ${displayRisk > 70 ? "text-destructive" : displayRisk > 40 ? "text-warning" : "text-success"}`}>
            {displayRisk > 70 ? "HIGH RISK" : displayRisk > 40 ? "MODERATE" : "LOW RISK"}
          </p>
        </motion.div>

        <div className="lg:col-span-2 glass-panel rounded-xl p-6 border border-border/10">
          <h3 className="text-lg font-semibold text-foreground mb-4">14-Day Risk Trend</h3>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 30%, 20%)" />
                <XAxis dataKey="day" stroke="hsl(215, 15%, 55%)" fontSize={10} interval={1} />
                <YAxis stroke="hsl(215, 15%, 55%)" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="score" stroke="hsl(0, 72%, 51%)" fill="hsl(0, 72%, 51%)" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-muted-foreground italic">No trend data available.</div>
          )}
        </div>
      </div>

      <div className="glass-panel rounded-xl p-6 border border-border/10">
        <h3 className="text-lg font-semibold text-foreground mb-4">Camera Risk Status</h3>
        <div className="space-y-3">
          {zoneRisks.length === 0 ? <p className="text-sm text-muted-foreground italic">No cameras configured.</p> : zoneRisks.map((z, i) => (
            <motion.div key={z.zone} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground w-40 shrink-0 truncate">{z.zone}</span>
              <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${z.score}%` }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className={`h-full rounded-full ${z.score > 70 ? "bg-destructive" : z.score > 40 ? "bg-warning" : "bg-success"}`}
                />
              </div>
              <span className={`text-sm font-bold w-10 text-right ${z.score > 70 ? "text-destructive" : z.score > 40 ? "text-warning" : "text-success"}`}>{z.score}</span>
              {z.trend === "up" ? <TrendingUp className="w-4 h-4 text-destructive" /> : <TrendingDown className="w-4 h-4 text-success" />}
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Camera className="w-3 h-3" />{z.cameras}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RiskScore;
