import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const routeMap: Record<string, { label: string; group?: string }> = {
  "/dashboard": { label: "Dashboard", group: "Monitoring" },
  "/dashboard/live": { label: "Live Monitoring", group: "Monitoring" },
  "/dashboard/grid": { label: "Camera Grid", group: "Monitoring" },
  "/dashboard/timeline": { label: "Incident Timeline", group: "Monitoring" },
  "/dashboard/alerts": { label: "Alerts", group: "Incident Management" },
  "/dashboard/critical-alerts": { label: "Critical Alerts", group: "Incident Management" },
  "/dashboard/alert-rules": { label: "Alert Rules", group: "Incident Management" },
  "/dashboard/evidence": { label: "Evidence Vault", group: "Incident Management" },
  "/dashboard/recordings": { label: "Recordings", group: "Incident Management" },
  "/dashboard/cameras": { label: "Cameras", group: "Camera Management" },
  "/dashboard/camera-health": { label: "Camera Health", group: "Camera Management" },
  "/dashboard/camera-logs": { label: "Camera Logs", group: "Camera Management" },
  "/dashboard/analytics": { label: "Analytics", group: "Analytics" },
  "/dashboard/risk-score": { label: "Risk Score", group: "Analytics" },
  "/dashboard/ai-metrics": { label: "AI Metrics", group: "Analytics" },
  "/dashboard/users": { label: "Users", group: "Governance" },
  "/dashboard/audit-logs": { label: "Audit Logs", group: "Governance" },
  "/dashboard/settings": { label: "Detection", group: "Configuration" },
  "/dashboard/alert-config": { label: "Alert Config", group: "Configuration" },
  "/dashboard/recording-policies": { label: "Recording", group: "Configuration" },
  "/dashboard/notification-settings": { label: "Notifications", group: "Configuration" },
  "/dashboard/storage": { label: "Storage", group: "Configuration" },
  "/dashboard/profile": { label: "Profile", group: "Account" },
  "/dashboard/account-settings": { label: "Account Settings", group: "Account" },
};

const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const route = routeMap[pathname];
  if (!route) return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
      <Link to="/dashboard" className="hover:text-foreground transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {route.group && (
        <>
          <ChevronRight className="w-3 h-3" />
          <span className="text-muted-foreground/70">{route.group}</span>
        </>
      )}
      <ChevronRight className="w-3 h-3" />
      <span className="text-foreground font-medium">{route.label}</span>
    </nav>
  );
};

export default Breadcrumbs;
