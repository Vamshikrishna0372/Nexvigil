import { Bell, User, ChevronDown, Shield, Settings, ScrollText, LogOut, Camera, AlertTriangle, Check, Plus, Zap, Moon, Sun, Sliders } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboardData } from "@/hooks/useDashboardData";
import { api } from "@/services/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const HeaderRight = () => {
  const { user, logout, isAdmin, isOrgAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Use Dashboard Data for Alerts
  const { recentAlerts = [], summary } = useDashboardData(isAdmin);

  // Map backend alerts to UI format
  const alerts = recentAlerts.map((a: any, idx: number) => ({
    id: a.id || a._id || `alert-${idx}`,
    object: a.object_detected,
    camera: a.camera_id,
    severity: a.severity,
    confidence: Math.round((a.confidence || 0) * 100),
    timestamp: new Date(a.created_at),
    read: a.is_acknowledged
  }));

  const userUnread = summary.unread_notifications || 0;

  const handleLogout = () => { logout(); navigate("/login"); };

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => api.alerts.acknowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recent-alerts"] });
    }
  });

  const severityColors: Record<string, string> = {
    critical: "bg-destructive",
    high: "bg-warning",
    medium: "bg-primary",
    low: "bg-muted-foreground",
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 h-full">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Toggle theme"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={theme}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </motion.div>
        </AnimatePresence>
      </button>

      {/* Notification Bell */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="relative p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-300 group">
            <Bell className="w-[20px] h-[20px] group-hover:scale-110 transition-transform" />
            <AnimatePresence>
              {userUnread > 0 && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute top-1 right-1 min-w-[15px] h-[15px] flex items-center justify-center bg-destructive text-[9px] font-black text-white rounded-full px-1 shadow-[0_0_8px_rgba(239,68,68,0.4)] border border-background"
                >
                  {userUnread > 99 ? "99+" : userUnread}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" className="w-[360px] sm:w-[400px] bg-card/95 backdrop-blur-md border-border/60 p-0 rounded-2xl shadow-2xl overflow-hidden z-[100]">
          <div className="flex items-center justify-between p-4 border-b border-border/40 bg-primary/5">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">Operational Activity</h4>
            {userUnread > 0 && <Badge variant="outline" className="text-[9px] h-4 border-primary/20 bg-primary/10 text-primary">{userUnread} UNREAD</Badge>}
          </div>
          <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto scrollbar-thin divide-y divide-border/10">
            {alerts.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground italic">System quiet — No recent activity</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  className={cn(
                    "group/alert px-4 py-4 hover:bg-primary/[0.03] transition-all cursor-pointer relative overflow-hidden",
                    !alert.read && "bg-primary/[0.05]"
                  )}
                  onClick={() => { if (isAdmin && !alert.read) acknowledgeMutation.mutate(alert.id); }}
                >
                  {!alert.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                  <div className="flex items-start gap-3">
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0 shadow-sm", severityColors[alert.severity])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground group-hover/alert:text-primary transition-colors">{alert.object}</span>
                          <Badge variant="outline" className={cn("text-[9px] font-black px-1.5 py-0 h-4 border-transparent uppercase tracking-wider",
                            alert.severity === "critical" ? "bg-destructive/10 text-destructive" :
                              alert.severity === "high" ? "bg-warning/10 text-warning" :
                                "bg-primary/10 text-primary"
                          )}>{alert.severity}</Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono bg-secondary/50 px-1.5 rounded">
                          {alert.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground/70 font-medium">
                        <span className="flex items-center gap-1"><Camera className="w-3 h-3 opacity-60" /> Node {alert.camera?.slice(-6).toUpperCase()}</span>
                        <span className="font-mono tracking-tighter">CONF: {alert.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-3 bg-secondary/20 border-t border-border/40">
            <Link to="/dashboard/alerts" className="block">
              <Button variant="ghost" size="sm" className="w-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary/5">AUDIT FULL FEED</Button>
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      {/* Quick Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-300 group hidden sm:flex border border-transparent hover:border-border/40">
            <Zap className="w-[18px] h-[18px] group-hover:text-primary group-hover:scale-110 transition-all" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-md border-border/60 p-1.5 rounded-2xl shadow-2xl z-[100]">
          <div className="px-3 py-2 border-b border-border/40 mb-1">
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Rapid Commands</h5>
          </div>
          {isAdmin ? (
            <>
              <DropdownMenuItem onClick={() => navigate("/dashboard/users")} className="gap-3 text-xs font-bold py-2.5 rounded-xl transition-all hover:bg-primary/10 hover:text-primary">
                <Plus className="w-4 h-4" />Register Operator
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard/cameras")} className="gap-3 text-xs font-bold py-2.5 rounded-xl transition-all hover:bg-primary/10 hover:text-primary">
                <Camera className="w-4 h-4" />Initialize Sensor Node
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard/critical-alerts")} className="gap-3 text-xs font-bold py-2.5 rounded-xl transition-all hover:bg-destructive/10 hover:text-destructive">
                <AlertTriangle className="w-4 h-4" />High Priority Feed
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={() => navigate("/dashboard/cameras")} className="gap-3 text-xs font-bold py-2.5 rounded-xl transition-all hover:bg-primary/10 hover:text-primary">
                <Camera className="w-4 h-4" />Link New Camera
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard/alerts")} className="gap-3 text-xs font-bold py-2.5 rounded-xl transition-all hover:bg-primary/10 hover:text-primary">
                <Bell className="w-4 h-4" />Personal Insight Feed
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Profile */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 sm:gap-3 px-1.5 py-1 rounded-xl hover:bg-secondary/60 transition-all duration-300 border border-transparent hover:border-border/40 group">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black shadow-inner transition-transform group-hover:scale-105",
              isAdmin ? "bg-destructive/15 text-destructive border border-destructive/20" : "bg-primary/15 text-primary border border-primary/20"
            )}>
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="hidden lg:block text-left">
              <span className="text-xs font-black text-foreground block leading-tight tracking-tight uppercase truncate max-w-[100px]">{user?.name}</span>
              <span className={cn("text-[9px] font-black uppercase tracking-widest opacity-70", isAdmin ? "text-destructive" : "text-primary")}>{user?.role}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden lg:inline group-hover:translate-y-0.5 transition-transform" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-card/95 backdrop-blur-md border-border/60 p-1.5 rounded-2xl shadow-2xl z-[100]">
          <div className="px-4 py-3.5 border-b border-border/40 mb-1.5 bg-primary/[0.02]">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black", isAdmin ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary")}>
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-foreground truncate uppercase">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground truncate font-medium">{user?.email}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="outline" className={cn("text-[9px] font-black tracking-widest px-2 py-0 border-transparent", isAdmin ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                <Shield className="w-3 h-3 mr-1" />{isAdmin ? "ADMIN CONTROL" : "OPERATOR"}
              </Badge>
              {isOrgAdmin && <Badge variant="outline" className="text-[9px] font-black tracking-widest px-2 py-0 bg-secondary text-muted-foreground border-transparent">ORG LEAD</Badge>}
            </div>
          </div>

          <div className="space-y-0.5">
            <DropdownMenuItem onClick={() => navigate("/dashboard/profile")} className="gap-3 text-xs font-bold py-2.5 rounded-xl transition-all hover:bg-primary/10 hover:text-primary cursor-pointer">
              <User className="w-4 h-4" />User Profile Matrix
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/dashboard/account-settings")} className="gap-3 text-xs font-bold py-2.5 rounded-xl transition-all hover:bg-primary/10 hover:text-primary cursor-pointer">
              <Settings className="w-4 h-4" />Account Authorization
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="gap-3 text-xs font-bold py-2.5 rounded-xl transition-all hover:bg-primary/10 hover:text-primary cursor-pointer">
                  <Sliders className="w-4 h-4" />System Core Config
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/audit-logs")} className="gap-3 text-xs font-bold py-2.5 rounded-xl transition-all hover:bg-primary/10 hover:text-primary cursor-pointer">
                  <ScrollText className="w-4 h-4" />Central Intelligence Logs
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator className="bg-border/40 mx-2" />
            <DropdownMenuItem onClick={handleLogout} className="gap-3 text-xs font-bold py-2.5 rounded-xl transition-all text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer">
              <LogOut className="w-4 h-4" />Terminate Session
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default HeaderRight;
