import { Bell, User, ChevronDown, Shield, Settings, ScrollText, LogOut, Camera, AlertTriangle, Check, Plus, Zap, Moon, Sun } from "lucide-react";
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
    <div className="flex items-center gap-1 sm:gap-1.5">
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
          <button className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-[18px] h-[18px]" />
            <AnimatePresence>
              {userUnread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full px-1"
                >
                  {userUnread > 99 ? "99+" : userUnread}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" className="w-[340px] sm:w-[380px] bg-card border-border p-0">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h4 className="text-sm font-semibold text-foreground">Recent Activity</h4>
          </div>
          <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto scrollbar-thin">
            {alerts.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">No recent alerts</p>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  className={cn("px-3 py-3 border-b border-border/30 hover:bg-secondary/30 transition-colors cursor-pointer", !alert.read && "bg-primary/5")}
                  onClick={() => { if (isAdmin && !alert.read) acknowledgeMutation.mutate(alert.id); }}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", severityColors[alert.severity])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{alert.object}</span>
                          <Badge variant="outline" className={cn("text-[9px] px-1",
                            alert.severity === "critical" ? "text-destructive border-destructive/30" :
                              alert.severity === "high" ? "text-warning border-warning/30" :
                                "text-primary border-primary/30"
                          )}>{alert.severity}</Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                          {alert.timestamp.toLocaleString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{alert.camera} — {alert.confidence}%</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-2 border-t border-border">
            <Link to="/dashboard/alerts" className="block">
              <Button variant="ghost" size="sm" className="w-full text-xs">View All Alerts</Button>
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      {/* Quick Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors hidden sm:flex">
            <Zap className="w-[18px] h-[18px]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-card border-border">
          {isAdmin && (
            <>
              <DropdownMenuItem onClick={() => navigate("/dashboard/users")} className="gap-2 text-sm"><Plus className="w-3.5 h-3.5" />Add User</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard/cameras")} className="gap-2 text-sm"><Camera className="w-3.5 h-3.5" />Add Camera</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard/critical-alerts")} className="gap-2 text-sm"><AlertTriangle className="w-3.5 h-3.5" />Critical Alerts</DropdownMenuItem>
            </>
          )}
          {!isAdmin && (
            <>
              <DropdownMenuItem onClick={() => navigate("/dashboard/cameras")} className="gap-2 text-sm"><Camera className="w-3.5 h-3.5" />Add Camera</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard/alerts")} className="gap-2 text-sm"><Bell className="w-3.5 h-3.5" />My Alerts</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Profile */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors">
            <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold", isAdmin ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary")}>
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="hidden md:block text-left">
              <span className="text-sm font-medium text-foreground block leading-tight">{user?.name}</span>
              <span className={cn("text-[10px] font-semibold uppercase", isAdmin ? "text-destructive" : "text-primary")}>{user?.role}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden md:inline" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 bg-card border-border">
          <div className="px-3 py-2.5 border-b border-border/50">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <Badge variant="outline" className={cn("mt-1.5 text-[9px]", isAdmin ? "text-destructive border-destructive/30" : "text-primary border-primary/30")}>
              <Shield className="w-2.5 h-2.5 mr-1" />{isAdmin ? "Administrator" : "Standard User"}
            </Badge>
          </div>
          <DropdownMenuItem onClick={() => navigate("/dashboard/profile")} className="gap-2 text-sm"><User className="w-3.5 h-3.5" />View Profile</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/dashboard/account-settings")} className="gap-2 text-sm"><Settings className="w-3.5 h-3.5" />Account Settings</DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="gap-2 text-sm"><Settings className="w-3.5 h-3.5" />System Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard/audit-logs")} className="gap-2 text-sm"><ScrollText className="w-3.5 h-3.5" />Audit Logs</DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="gap-2 text-sm text-destructive focus:text-destructive"><LogOut className="w-3.5 h-3.5" />Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default HeaderRight;
