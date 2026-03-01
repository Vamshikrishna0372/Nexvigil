import { Brain, Cpu, Clock, Target, Zap } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";

const tooltipStyle = { backgroundColor: "hsl(216, 45%, 12%)", border: "1px solid hsl(216, 30%, 20%)", borderRadius: "8px", color: "hsl(210, 20%, 90%)" };

const AIModelMetrics = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["ai-metrics-page"],
    queryFn: async () => {
      const { data } = await api.system.aiMetrics();
      return data as any;
    },
    refetchInterval: 15000
  });

  if (isLoading) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 glass-panel rounded-xl border border-border/10">
            <Skeleton className="w-5 h-5 mb-4" />
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="glass-panel rounded-xl p-6 border border-border/10">
        <Skeleton className="h-6 w-48 mb-6" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  );

  const stats = [
    { label: "Model Accuracy", value: "94.2%", icon: Target, color: "text-success" },
    { label: "Avg Inference", value: `${metrics?.inference_time_ms || 0}ms`, icon: Clock, color: "text-primary" },
    { label: "Detections Total", value: `${metrics?.total_detections || 0}`, icon: Zap, color: "text-warning" },
    { label: "GPU Utilization", value: `${metrics?.gpu_usage_percent || 0}%`, icon: Cpu, color: "text-primary" },
  ];

  const classData = metrics?.per_class || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Model Metrics</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {metrics?.model || "YOLO11"} performance monitoring — {metrics?.status || "online"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="p-4 glass-panel rounded-xl border border-border/10">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="glass-panel rounded-xl p-6 lg:col-span-2 border border-border/10">
        <h3 className="text-lg font-semibold text-foreground mb-4">Per-Class Accuracy</h3>
        {classData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={classData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 30%, 20%)" />
              <XAxis dataKey="cls" stroke="hsl(215, 15%, 55%)" fontSize={12} />
              <YAxis stroke="hsl(215, 15%, 55%)" fontSize={12} domain={[70, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="precision" fill="hsl(175, 70%, 45%)" radius={[2, 2, 0, 0]} name="Precision" />
              <Bar dataKey="recall" fill="hsl(152, 60%, 45%)" radius={[2, 2, 0, 0]} name="Recall" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground italic">No class metrics available.</div>
        )}
      </div>
    </div>
  );
};

export default AIModelMetrics;
