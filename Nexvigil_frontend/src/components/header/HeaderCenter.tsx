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
    <div className="hidden lg:flex items-center gap-6">
      <div className="flex items-center gap-4 bg-secondary/30 px-4 py-1.5 rounded-full border border-border/40 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground/80 tracking-tight">
          <span className="opacity-50 uppercase text-[9px] tracking-[0.1em]">Session</span>
          <span className="font-mono">
            {currentTime.toLocaleTimeString(undefined, { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        <div className="h-3 w-px bg-border/40" />
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {currentTime.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
        </div>
      </div>

      <div className={cn(
        "flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] border rounded-xl px-3 py-1.5 tabular-nums transition-all duration-500 shadow-sm backdrop-blur-md",
        riskColor,
        riskScore > 70 ? "animate-pulse shadow-destructive/20" : "shadow-primary/10"
      )}>
        <span className="opacity-60">Risk Protocol:</span>
        <AnimatePresence mode="wait">
          <motion.div
            key={riskScore}
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex items-center gap-1.5"
          >
            <div className={cn("w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]")} />
            <span className="font-black">{riskScore}% {riskLabel}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HeaderCenter;
