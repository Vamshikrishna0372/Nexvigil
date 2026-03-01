/**
 * SystemHealth.tsx
 * Displays real-time system health from GET /system/health
 * All data sourced from backend — no mock values.
 */
import { Activity, Brain, Camera, Cpu, HardDrive, Server, Database, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
};

const MetricCard = ({
    icon: Icon,
    label,
    value,
    sub,
    color = "text-primary",
}: {
    icon: any;
    label: string;
    value: string | number;
    sub?: string;
    color?: string;
}) => (
    <motion.div variants={fadeUp} className="glass-panel rounded-xl p-5 border border-border/10">
        <div className="flex items-center gap-3 mb-3">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center bg-secondary/60", color.replace("text-", "bg-").replace("/", "/20"))}>
                <Icon className={cn("w-4 h-4", color)} />
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
        </div>
        <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </motion.div>
);

const SystemHealth = () => {
    const { data: health, isLoading, dataUpdatedAt } = useQuery({
        queryKey: ["system-health"],
        queryFn: async () => {
            const { data } = await api.system.health();
            const raw = data as any;
            return raw?.data ?? raw;
        },
        refetchInterval: 10000,
        refetchIntervalInBackground: false,
    });

    const { data: summary } = useQuery({
        queryKey: ["system-summary-health"],
        queryFn: async () => {
            const { data } = await api.system.summary();
            const raw = data as any;
            return raw?.data ?? raw;
        },
        refetchInterval: 10000,
    });

    const aiStatus = health?.ai_engine_status ?? "unknown";
    const dbStatus = health?.database_status ?? "unknown";

    const aiColor = aiStatus === "running" ? "text-success" : "text-destructive";
    const dbColor = dbStatus === "connected" ? "text-success" : "text-destructive";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">System Health</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Real-time backend & AI engine diagnostics
                        {dataUpdatedAt > 0 && (
                            <span className="ml-2 text-[10px] text-muted-foreground/60 font-mono">
                                — last update {new Date(dataUpdatedAt).toLocaleTimeString()}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge
                        variant="outline"
                        className={cn(
                            "gap-1.5 px-3",
                            aiStatus === "running" ? "text-success border-success/30" : "text-destructive border-destructive/30"
                        )}
                    >
                        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", aiStatus === "running" ? "bg-success" : "bg-destructive")} />
                        AI {aiStatus === "running" ? "Running" : "Stopped"}
                    </Badge>
                    <Badge
                        variant="outline"
                        className={cn(
                            "gap-1.5 px-3",
                            dbStatus === "connected" ? "text-success border-success/30" : "text-destructive border-destructive/30"
                        )}
                    >
                        <Database className="w-3 h-3" />
                        DB {dbStatus}
                    </Badge>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="glass-panel p-5 rounded-xl border border-border/10">
                            <div className="flex items-center gap-3 mb-3">
                                <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <Skeleton className="h-8 w-24 mb-2" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <motion.div
                        variants={stagger}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                    >
                        <MetricCard
                            icon={Brain}
                            label="AI Engine"
                            value={health?.ai_engine_status ?? "unknown"}
                            sub="Rule-based detection active"
                            color={aiColor}
                        />
                        <MetricCard
                            icon={Camera}
                            label="Active Cameras"
                            value={health?.active_cameras ?? 0}
                            sub={`${summary?.offline_cameras ?? 0} offline`}
                            color="text-primary"
                        />
                        <MetricCard
                            icon={Activity}
                            label="Threads"
                            value={health?.total_threads ?? 0}
                            sub="Backend worker threads"
                            color="text-primary"
                        />
                        <MetricCard
                            icon={HardDrive}
                            label="Memory Usage"
                            value={`${health?.memory_usage_mb ?? 0} MB`}
                            sub={`${health?.memory_percent ?? 0}% of system`}
                            color="text-warning"
                        />
                        <MetricCard
                            icon={Cpu}
                            label="CPU Usage"
                            value={`${health?.cpu_percent ?? 0}%`}
                            sub="Process CPU load"
                            color={health?.cpu_percent > 80 ? "text-destructive" : "text-success"}
                        />
                        <MetricCard
                            icon={Clock}
                            label="Uptime"
                            value={formatUptime(health?.uptime_seconds ?? 0)}
                            sub="Backend server uptime"
                            color="text-primary"
                        />
                        <MetricCard
                            icon={Database}
                            label="DB Status"
                            value={health?.database_status ?? "unknown"}
                            sub="MongoDB connection"
                            color={dbColor}
                        />
                        <MetricCard
                            icon={Server}
                            label="Total Alerts"
                            value={health?.total_alerts_in_db ?? 0}
                            sub="Records in database"
                            color="text-muted-foreground"
                        />
                    </motion.div>

                    {summary && (
                        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="glass-panel rounded-xl p-5 border border-border/10">
                            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-primary" />
                                Alert Distribution (Real-time from DB)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "Critical", count: summary.critical_alerts, color: "bg-destructive", text: "text-destructive" },
                                    { label: "High", count: summary.high_alerts, color: "bg-orange-500", text: "text-orange-400" },
                                    { label: "Medium", count: summary.medium_alerts, color: "bg-purple-500", text: "text-purple-400" },
                                    { label: "Low", count: summary.low_alerts, color: "bg-muted-foreground", text: "text-muted-foreground" },
                                ].map(s => (
                                    <div key={s.label} className="bg-secondary/30 rounded-xl p-4 text-center">
                                        <div className={cn("text-3xl font-bold tabular-nums mb-1", s.text)}>{s.count}</div>
                                        <div className="flex items-center justify-center gap-1.5">
                                            <div className={cn("w-2 h-2 rounded-full", s.color)} />
                                            <span className="text-xs text-muted-foreground">{s.label}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    <motion.div variants={fadeUp} initial="hidden" animate="visible" className="glass-panel rounded-xl p-5 border border-primary/10">
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Server className="w-4 h-4 text-primary" />
                            API Endpoint Reference
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                            {[
                                { method: "GET", path: "/system/health", desc: "This page — real system metrics" },
                                { method: "GET", path: "/system/summary", desc: "Dashboard — cameras, alerts, storage" },
                                { method: "GET", path: "/internal/cameras/active", desc: "Active cameras for AI agent" },
                                { method: "GET", path: "/internal/rules/active", desc: "Active detection rules for AI agent" },
                                { method: "POST", path: "/internal/alerts", desc: "Alert injection from AI agent" },
                                { method: "POST", path: "/internal/camera-heartbeat", desc: "Camera health update" },
                            ].map(ep => (
                                <div key={ep.path} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary w-10 text-center font-bold">{ep.method}</span>
                                    <span className="text-primary/80 flex-1 truncate">{ep.path}</span>
                                    <span className="text-muted-foreground/60 hidden md:block">{ep.desc}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </>
            )}
        </div>
    );
};

export default SystemHealth;
