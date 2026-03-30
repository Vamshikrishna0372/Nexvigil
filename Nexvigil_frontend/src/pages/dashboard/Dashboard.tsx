import {
  Bell, Camera, AlertTriangle, HardDrive, TrendingUp, TrendingDown,
  Shield, Gauge, Brain, ArrowUpRight, WifiOff, CalendarDays, Activity
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api";

const SEV_COLORS: Record<string, string> = {
  critical: "hsl(0, 72%, 51%)",
  high: "hsl(38, 92%, 50%)",
  medium: "hsl(216, 91%, 60%)",
  low: "hsl(215, 15%, 55%)",
};
const tooltipStyle = {
  backgroundColor: "hsl(216,45%,12%)",
  border: "1px solid hsl(216,30%,20%)",
  borderRadius: "8px",
  color: "hsl(210,20%,90%)",
  fontSize: "12px",
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const { summary, riskScore, recentAlerts, aiStatus, isLoading } = useDashboardData(isAdmin);

  if (isLoading) return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl bg-secondary/20" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-[400px] rounded-xl bg-secondary/20" />
        <div className="space-y-4">
          <Skeleton className="h-[200px] rounded-xl bg-secondary/20" />
          <Skeleton className="h-[180px] rounded-xl bg-secondary/20" />
        </div>
      </div>
    </div>
  );

  // Stats cards — all from real DB data
  const stats = [
    {
      label: "Active Cameras",
      value: String(summary.active_cameras),
      sub: `${summary.offline_cameras} offline`,
      up: summary.active_cameras > 0,
      icon: Camera,
      color: "text-success",
      link: "/dashboard/cameras",
    },
    {
      label: "Total Alerts",
      value: String(summary.total_alerts),
      sub: `+${summary.alerts_today} today`,
      up: true,
      icon: Bell,
      color: "text-primary",
      link: "/dashboard/alerts",
    },
    {
      label: "Critical",
      value: String(summary.critical_alerts),
      sub: `${summary.high_alerts} high`,
      up: summary.critical_alerts > 0,
      icon: AlertTriangle,
      color: "text-destructive",
      link: "/dashboard/alerts",
    },
    {
      label: "Risk Score",
      value: String(riskScore),
      sub: riskScore > 70 ? "High Risk" : "Normal",
      up: riskScore > 70,
      icon: Gauge,
      color: riskScore > 70 ? "text-destructive" : "text-success",
      link: "/dashboard/alerts",
    },
    {
      label: "Storage Used",
      value: `${Math.round(summary.storage_used_mb)} MB`,
      sub: "Local filesystem",
      up: true,
      icon: HardDrive,
      color: "text-muted-foreground",
      link: "/dashboard/settings",
    },
    {
      label: "AI Engine",
      value: summary.ai_status === "running" ? "Active" : "Stopped",
      sub: summary.ai_status,
      up: summary.ai_status === "running",
      icon: Brain,
      color: summary.ai_status === "running" ? "text-success" : "text-destructive",
      link: "/dashboard/settings",
    },
  ];

  // Severity Pie chart data — from real DB counts
  const severityPieData = [
    { name: "Critical", value: summary.critical_alerts, color: SEV_COLORS.critical },
    { name: "High", value: summary.high_alerts, color: SEV_COLORS.high },
    { name: "Medium", value: summary.medium_alerts, color: SEV_COLORS.medium },
    { name: "Low", value: summary.low_alerts, color: SEV_COLORS.low },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {isAdmin ? "Admin Dashboard" : "User Dashboard"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Real-time surveillance overview — all data from database
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            isAdmin ? "text-destructive border-destructive/30" : "text-primary border-primary/30",
            "gap-1.5 px-3 py-1"
          )}
        >
          <Shield className="w-3 h-3" />
          {isAdmin ? "Administrator" : "User"}
        </Badge>
      </div>

      {/* Stats Grid */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3"
      >
        {stats.map((s) => (
          <motion.div key={s.label} variants={fadeUp}>
            <Link to={s.link} className="block stat-card group">
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${s.color}`} />
                <ArrowUpRight className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{s.value}</div>
              <div className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{s.label}</div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                {s.up
                  ? <TrendingUp className="w-3 h-3 text-primary" />
                  : <TrendingDown className="w-3 h-3 text-muted-foreground" />}
                {s.sub}
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom Row: Recent Alerts + Severity Breakdown + Most Detected */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Alerts */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="lg:col-span-2 glass-panel rounded-xl p-4 sm:p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Recent Alerts
              {summary.alerts_today > 0 && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                  +{summary.alerts_today} today
                </Badge>
              )}
            </h3>
            <Link to="/dashboard/alerts">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-primary">View All</Button>
            </Link>
          </div>
          <div className="space-y-2.5">
            {recentAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center bg-secondary/20 rounded-xl border border-dashed border-border/50">No alerts yet. AI engine will create alerts when rules are triggered.</p>
            ) : (
              <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-2">
                {recentAlerts.map((a: any, i: number) => (
                  <motion.div
                    key={a.id || i}
                    variants={fadeUp}
                    className="flex justify-between items-center p-3 rounded-xl bg-secondary/30 border border-border/20 hover:border-primary/40 hover:bg-secondary/50 transition-all duration-300 group/item"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden border border-white/5 bg-black/40">
                        {a.screenshot_path ? (
                          <img
                            src={api.media.getScreenshotUrl(a.screenshot_path)}
                            alt={a.object_detected}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover/item:scale-110"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center opacity-20">
                            <Activity className="w-5 h-5" />
                          </div>
                        )}
                        <div className={cn(
                          "absolute top-1 left-1 w-2 h-2 rounded-full",
                          a.severity === "critical" ? "bg-destructive animate-pulse" :
                            a.severity === "high" ? "bg-warning" : "bg-primary"
                        )} />
                        {a.duration_seconds && (
                          <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 backdrop-blur-md rounded text-[7px] font-bold text-white tracking-widest leading-none border border-white/5">
                            {a.duration_seconds.toFixed(0)}S
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-foreground block truncate group-hover/item:text-primary transition-colors">
                          {a.object_detected}
                        </span>
                        {a.description && (
                          <div className="text-[10px] text-muted-foreground line-clamp-1 italic max-w-[150px] sm:max-w-[280px]">
                            {a.description}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-tight">
                            {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span className="text-[10px] text-primary/40">•</span>
                          <span className="text-[10px] font-mono text-muted-foreground/60">
                            Node {a.camera_id?.slice(-4).toUpperCase() || "SYS"}
                          </span>
                        </div>

                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-[10px] font-bold text-primary/80 uppercase tracking-tighter">{((a.confidence || 0) * 100).toFixed(0)}%</div>
                      </div>
                      <Link to={`/dashboard/alerts/${a.id}`}>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-primary hover:text-white transition-all opacity-0 group-hover/item:opacity-100">
                          <ArrowUpRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Right Column */}
        <div className="flex flex-col gap-4">

          {/* Alerts by Severity Pie */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
              Alerts by Severity
            </h3>
            {severityPieData.length === 0 ? (
              <div className="text-center py-4 text-xs text-muted-foreground">
                No alerts — system is clear
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie
                    data={severityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {severityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="grid grid-cols-2 gap-1 mt-1">
              {[
                { label: "Critical", count: summary.critical_alerts, color: "bg-destructive" },
                { label: "High", count: summary.high_alerts, color: "bg-orange-500" },
                { label: "Medium", count: summary.medium_alerts, color: "bg-purple-500" },
                { label: "Low", count: summary.low_alerts, color: "bg-muted-foreground" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className={`w-2 h-2 rounded-full ${s.color}`} />
                  {s.label}: <span className="text-foreground font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Most Detected (Last 24h) */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="glass-panel rounded-xl p-4 flex-1">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
              Most Detected (24h)
            </h3>
            {summary.most_detected.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No detections in last 24h</p>
            ) : (
              <div className="space-y-2">
                {summary.most_detected.map((item, i) => (
                  <div key={item.object} className="flex items-center justify-between">
                    <span className="text-xs text-foreground/80 capitalize">{item.object}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-1.5 rounded-full bg-primary/60"
                        style={{ width: `${Math.min(80, (item.count / (summary.most_detected[0]?.count || 1)) * 80)}px` }}
                      />
                      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Camera health summary */}
          {summary.offline_cameras > 0 && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="glass-panel rounded-xl p-3 border border-destructive/20 bg-destructive/5"
            >
              <div className="flex items-center gap-2 text-destructive">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">{summary.offline_cameras} Camera{summary.offline_cameras > 1 ? "s" : ""} Offline</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Check camera connections in Camera Management
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
