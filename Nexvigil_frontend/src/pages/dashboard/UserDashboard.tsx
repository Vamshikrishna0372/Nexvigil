import { Bell, Camera, HardDrive, TrendingUp, TrendingDown, Gauge, ArrowUpRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const tooltipStyle = { backgroundColor: "hsl(216, 45%, 12%)", border: "1px solid hsl(216, 30%, 20%)", borderRadius: "8px", color: "hsl(210, 20%, 90%)", fontSize: "12px" };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const UserDashboard = () => {
  const { user } = useAuth();
  const { summary, riskScore, recentAlerts, trends, isLoading } = useDashboardData(false);

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 rounded-full" />
        </div>
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card p-6 border border-border/10">
            <Skeleton className="w-5 h-5 mb-4" />
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-8 rounded-xl border border-border/10">
          <Skeleton className="h-6 w-48 mb-6" />
          <Skeleton className="h-[260px] w-full rounded-lg" />
        </div>
        <div className="glass-panel p-8 rounded-xl border border-border/10">
          <Skeleton className="h-6 w-32 mb-6" />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const stats = [
    { label: "My Alerts", value: String(summary.total_alerts), change: `${summary.critical_alerts} critical`, up: summary.critical_alerts > 0, icon: Bell, color: "text-primary", link: "/dashboard/alerts" },
    { label: "My Cameras", value: String(summary.active_cameras), change: "Active", up: summary.active_cameras > 0, icon: Camera, color: "text-success", link: "/dashboard/cameras" },
    { label: "Risk Score", value: String(riskScore), change: "Personal", up: riskScore > 50, icon: Gauge, color: riskScore > 50 ? "text-warning" : "text-success", link: "/dashboard/profile" },
    { label: "Storage", value: `${Math.round(summary.storage_used_mb)} MB`, change: "Used", up: false, icon: HardDrive, color: "text-muted-foreground", link: "/dashboard/storage" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Welcome, {user?.name?.split(" ")[0]}</h1>
          <p className="text-muted-foreground text-sm mt-0.5 font-medium">Your surveillance overview</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary/30 gap-2 px-3 py-1.5 font-bold uppercase tracking-widest text-[10px]">
          <span className="w-2 h-2 rounded-full bg-primary" />
          Standard User
        </Badge>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <motion.div key={s.label} variants={fadeUp}>
            <Link to={s.link} className="block stat-card group border border-border/10 p-4 sm:p-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${s.color}`} />
                <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{s.value}</div>
              <div className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 font-medium">{s.label}</div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-2 bg-secondary/30 w-fit px-1.5 py-0.5 rounded">
                {s.up ? <TrendingUp className="w-3 h-3 text-primary" /> : <TrendingDown className="w-3 h-3 text-muted-foreground" />}
                {s.change}
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="lg:col-span-2 glass-panel rounded-xl p-4 sm:p-6 border border-border/10">
          <h3 className="text-base font-semibold text-foreground mb-4 uppercase tracking-tight">My Weekly Alerts</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="userAlertGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(175, 70%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(175, 70%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 30%, 18%)" />
              <XAxis dataKey="day" stroke="hsl(215, 15%, 55%)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(215, 15%, 55%)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="alerts" stroke="hsl(175, 70%, 45%)" strokeWidth={2} fill="url(#userAlertGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="glass-panel rounded-xl p-4 sm:p-6 border border-border/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground uppercase tracking-tight">Recent Activity</h3>
            <Link to="/dashboard/alerts">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-primary uppercase font-bold tracking-widest">View All</Button>
            </Link>
          </div>
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
            {recentAlerts.length === 0 ? <p className="text-muted-foreground text-xs text-center italic py-4">No recent alerts found</p> : recentAlerts.map((a: any) => (
              <div key={a.id} className="flex justify-between items-center p-2.5 bg-secondary/20 hover:bg-secondary/40 transition-colors border border-border/5 rounded-lg text-sm group">
                <div className="flex flex-col items-start translate-x-0 group-hover:translate-x-1 transition-transform">
                  <span className="font-semibold text-foreground">{a.object_detected}</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-primary/40" />
                    {new Date(a.created_at).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                </div>
                <Badge variant={a.severity === "critical" ? "destructive" : "outline"} className="text-[9px] px-1.5 h-4 font-bold border-opacity-30">
                  {a.severity}
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default UserDashboard;
