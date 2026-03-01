import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Shield } from "lucide-react";

interface LoadingStateProps {
  text?: string;
  className?: string;
  fullPage?: boolean;
}

const LoadingState = ({ text = "AI ENGINE SCANNING...", className, fullPage = false }: LoadingStateProps) => {
  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-6", className)}>
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Outer Glowing Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]"
        />

        {/* Radar Sweep */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-40 origin-center"
        />

        {/* Pulse Ring */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-4 rounded-full border border-cyan-500/30"
        />

        {/* Core Icon */}
        <motion.div
          animate={{ scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10"
        >
          <Shield className="w-10 h-10 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase"
        >
          {text}
        </motion.p>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
              className="w-1 h-1 rounded-full bg-cyan-400"
            />
          ))}
        </div>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingState;
export { LoadingState };
