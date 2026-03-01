import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, useMemo } from "react";
import {
  LayoutDashboard, MonitorPlay, Bell, Film, Camera, BarChart3,
  Shield, Menu, X,
  Grid3X3, Clock, AlertTriangle, Sliders, Archive, HeartPulse,
  FileText, Gauge, Brain, Users, ScrollText, Server,
  Target, BellRing, HardDrive, ChevronRight, LogOut, ChevronLeft,
  PanelLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import HeaderLeft from "@/components/header/HeaderLeft";
import HeaderCenter from "@/components/header/HeaderCenter";
import HeaderRight from "@/components/header/HeaderRight";
import Breadcrumbs from "@/components/Breadcrumbs";

interface NavGroup {
  label: string;
  adminOnly?: boolean;
  items: { label: string; icon: any; path: string; adminOnly?: boolean }[];
}

const allNavGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "Live Monitoring", icon: MonitorPlay, path: "/dashboard/live" },
      { label: "Camera Grid", icon: Grid3X3, path: "/dashboard/grid" },
      { label: "Incident Timeline", icon: Clock, path: "/dashboard/timeline" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Alerts", icon: Bell, path: "/dashboard/alerts" },
      { label: "Critical Alerts", icon: AlertTriangle, path: "/dashboard/critical-alerts" },
      { label: "Alert Rules", icon: Sliders, path: "/dashboard/alert-rules" },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Evidence Vault", icon: Archive, path: "/dashboard/evidence" },
      { label: "Recordings", icon: Film, path: "/dashboard/recordings" },
    ],
  },
  {
    label: "Analytics & AI",
    items: [
      { label: "Analytics", icon: BarChart3, path: "/dashboard/analytics" },
      { label: "Risk Score", icon: Gauge, path: "/dashboard/risk-score" },
      { label: "AI Metrics", icon: Brain, path: "/dashboard/ai-metrics", adminOnly: true },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { label: "Cameras", icon: Camera, path: "/dashboard/cameras" },
      { label: "Camera Health", icon: HeartPulse, path: "/dashboard/camera-health" },
      { label: "Camera Logs", icon: FileText, path: "/dashboard/camera-logs" },
    ],
  },
  {
    label: "System Control",
    adminOnly: true,
    items: [
      { label: "Users", icon: Users, path: "/dashboard/users" },
      { label: "Audit Logs", icon: ScrollText, path: "/dashboard/audit-logs" },
      { label: "System Health", icon: Server, path: "/dashboard/system-health", adminOnly: true },
      { label: "AI & Email Setup", icon: Target, path: "/dashboard/settings" },
      { label: "Storage Central", icon: HardDrive, path: "/dashboard/storage" },
    ],
  },
];


const DashboardLayout = () => {
  const location = useLocation();
  const { isAdmin, logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Persisted sidebar expansion state for Desktop
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const stored = localStorage.getItem("nexvigil-sidebar-expanded");
    return stored !== null ? stored === "true" : true;
  });

  const toggleSidebar = () => {
    const newVal = !sidebarExpanded;
    setSidebarExpanded(newVal);
    localStorage.setItem("nexvigil-sidebar-expanded", String(newVal));
  };

  const navGroups = useMemo(() =>
    allNavGroups
      .filter((g) => !g.adminOnly || isAdmin)
      .map((g) => ({ ...g, items: g.items.filter((item) => !item.adminOnly || isAdmin) })),
    [isAdmin]
  );

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => isActive(item.path));

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navGroups.forEach((g) => { initial[g.label] = isGroupActive(g); });
    return initial;
  });

  const toggleGroup = (label: string) => {
    if (!sidebarExpanded) {
      setSidebarExpanded(true);
      setExpandedGroups(prev => ({ ...prev, [label]: true }));
      return;
    }
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
  };

  const renderNavItems = (items: NavGroup['items']) => {
    return items.map((item) => {
      const active = isActive(item.path);
      const content = (
        <Link
          key={item.path + item.label}
          to={item.path}
          onClick={handleNavClick}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative group/item mb-1 share-layout",
            active
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
            !sidebarExpanded && "justify-center px-0 w-11 mx-auto"
          )}
        >
          <item.icon className={cn("w-[20px] h-[20px] shrink-0", active ? "text-primary-foreground" : "text-muted-foreground group-hover/item:text-foreground")} />
          {sidebarExpanded && <span className="truncate flex-1 tracking-tight">{item.label}</span>}
          {sidebarExpanded && active && (
            <motion.div layoutId="active-pill" className="w-1.5 h-4 bg-primary-foreground/30 rounded-full" />
          )}
        </Link>
      );

      if (!sidebarExpanded) {
        return (
          <Tooltip key={item.path + item.label} delayDuration={0}>
            <TooltipTrigger asChild>
              {content}
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10} className="font-bold border-primary/20 bg-card text-foreground">
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      }
      return content;
    });
  };

  return (
    <div className="h-screen bg-background flex w-full overflow-hidden relative font-sans">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 lg:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop (Fixed Width Animation) */}
      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 bg-card border-r border-border transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-50 hidden lg:flex flex-col shadow-xl",
          sidebarExpanded ? "w-[260px]" : "w-[80px]"
        )}
      >
        <div className="flex items-center h-16 shrink-0 border-b border-border/40 px-5 bg-card/50">
          <Link to="/dashboard" className="flex items-center gap-3 group/logo">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center transition-transform duration-300 group-hover/logo:scale-105 shadow-inner">
              <Shield className="h-5.5 w-5.5 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.4)]" />
            </div>
            <AnimatePresence mode="popLayout">
              {sidebarExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-lg font-bold text-foreground tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 overflow-hidden"
                >
                  Nexvigil
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 scrollbar-none hover:scrollbar-thin transition-all space-y-6">
          {navGroups.map((group, idx) => {
            const hasExpandedGroup = expandedGroups[group.label];
            return (
              <div key={group.label} className="space-y-2">
                {sidebarExpanded ? (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="flex items-center justify-between w-full px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 hover:text-primary transition-colors py-1 group/section"
                  >
                    <span>{group.label}</span>
                    <ChevronRight className={cn("w-3 h-3 transition-transform duration-200 group-hover/section:translate-x-0.5", hasExpandedGroup && "rotate-90")} />
                  </button>
                ) : (
                  <div className="px-2">
                    <Separator className="bg-border/40" />
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {(sidebarExpanded ? hasExpandedGroup : true) && (
                    <motion.div
                      initial={sidebarExpanded ? { height: 0, opacity: 0 } : false}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-0.5 overflow-hidden"
                    >
                      {renderNavItems(group.items)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/40 bg-secondary/5">
          {sidebarExpanded ? (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-background/50 border border-border/30 mb-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-foreground truncate">{user?.name}</p>
                <p className="text-[9px] text-muted-foreground truncate uppercase tracking-widest">{isAdmin ? "Admin" : "Operator"}</p>
              </div>
            </div>
          ) : null}

          <button
            onClick={() => logout()}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold text-destructive hover:bg-destructive/10 transition-all duration-200 group/logout w-full",
              !sidebarExpanded && "justify-center px-0 h-11"
            )}
          >
            <LogOut className="w-5 h-5 transition-transform group-hover/logout:-translate-x-1" />
            {sidebarExpanded && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 w-[280px] bg-card border-r border-border z-[70] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full shadow-none"
        )}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-border shadow-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tighter">Nexvigil</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-xl hover:bg-secondary active:scale-90 transition-transform">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-8">
          {navGroups.map(group => (
            <div key={group.label} className="space-y-3">
              <h3 className="px-2 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60">{group.label}</h3>
              <div className="space-y-1.5">
                {group.items.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3.5 rounded-xl text-[14px] font-bold transition-all active:scale-[0.98]",
                      isActive(item.path) ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-5 border-t border-border bg-muted/20">
          <button onClick={() => logout()} className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-destructive text-destructive-foreground font-black uppercase tracking-widest text-[12px] shadow-lg shadow-destructive/20 hover:brightness-110 active:scale-95 transition-all">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 h-screen transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative",
          sidebarExpanded ? "lg:ml-[260px]" : "lg:ml-[80px]"
        )}
      >
        <header className="h-16 border-b border-border bg-card/60 backdrop-blur-3xl flex items-center px-0 sticky top-0 z-40 transition-shadow duration-300">
          <div className="flex-1 flex items-center justify-start min-w-0">
            {/* Unified Sidebar Toggle - Corner Block Style */}
            <button
              onClick={() => {
                if (window.innerWidth < 1024) setIsMobileMenuOpen(true);
                else toggleSidebar();
              }}
              className="h-16 w-16 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-all border-r border-border/40 shrink-0 group/toggle active:scale-95"
              title="Toggle Navigation"
            >
              <motion.div
                animate={{
                  rotate: sidebarExpanded ? 0 : 180,
                  scale: sidebarExpanded ? 1 : 1.1
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <Menu className={cn(
                  "w-6 h-6 transition-colors",
                  sidebarExpanded ? "text-muted-foreground" : "text-primary text-primary/80"
                )} />
              </motion.div>
            </button>

            {/* Header Content with offset padding */}
            <div className="flex items-center gap-3 px-4 sm:px-6 flex-1 overflow-hidden">
              <HeaderLeft />
            </div>
          </div>

          <div className="hidden lg:flex flex-1 items-center justify-center">
            <HeaderCenter />
          </div>

          <div className="flex-1 flex items-center justify-end gap-1.5 sm:gap-3">
            <HeaderRight />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border/60 p-4 sm:p-6 md:p-10 bg-background/50 relative">
          <div className="max-w-[1500px] mx-auto space-y-10 pb-20">
            <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-4 duration-500">
              <Breadcrumbs />
            </div>

            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <Outlet />
            </motion.div>
          </div>

          {/* Subtle background decoration */}
          <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] -z-10 rounded-full" />
          <div className="fixed bottom-0 left-[260px] w-[300px] h-[300px] bg-accent/5 blur-[100px] -z-10 rounded-full" />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
