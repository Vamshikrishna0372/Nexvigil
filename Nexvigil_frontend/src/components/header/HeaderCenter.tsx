import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const HeaderCenter = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { isAdmin } = useAuth();
  const { riskScore } = useDashboardData(isAdmin);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const riskColor = riskScore > 70 ? "text-destructive border-destructive/30 bg-destructive/10" : riskScore > 40 ? "text-warning border-warning/30 bg-warning/10" : "text-success border-success/30 bg-success/10";
  const riskLabel = riskScore > 70 ? "High" : riskScore > 40 ? "Moderate" : "Low";

  return (
    <div className="hidden lg:flex items-center gap-3">
      <div className="text-sm font-mono text-muted-foreground flex items-center gap-2">
        <span className="text-foreground font-medium">
          {currentTime.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
        </span>
        <span className="text-border">•</span>
        <span>{currentTime.toLocaleTimeString(undefined, { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      </div>
      <div className={cn("flex items-center gap-1.5 text-[11px] font-bold border rounded-full px-2.5 py-0.5 tabular-nums", riskColor)}>
        <AnimatePresence mode="wait">
          <motion.span
            key={riskScore}
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 6, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="inline-flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {riskScore} {riskLabel}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HeaderCenter;
