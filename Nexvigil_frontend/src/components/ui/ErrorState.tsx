import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorState = ({ title = "Something went wrong", message = "An unexpected error occurred. Please try again.", onRetry, className }: ErrorStateProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className={cn("glass-panel rounded-xl p-12 text-center border-destructive/20", className)}
  >
    <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
      <AlertCircle className="w-8 h-8 text-destructive/60" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-md mx-auto">{message}</p>
    {onRetry && (
      <Button variant="outline" className="mt-4 gap-2" onClick={onRetry}>
        <RefreshCw className="w-4 h-4" /> Retry
      </Button>
    )}
  </motion.div>
);

export default ErrorState;
