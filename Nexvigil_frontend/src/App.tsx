import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { SimulationProvider } from "./contexts/SimulationContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const DashboardIndex = lazy(() => import("./pages/dashboard/DashboardIndex"));
const LiveMonitoring = lazy(() => import("./pages/dashboard/LiveMonitoring"));
const MultiCameraGrid = lazy(() => import("./pages/dashboard/MultiCameraGrid"));
const IncidentTimeline = lazy(() => import("./pages/dashboard/IncidentTimeline"));
const Alerts = lazy(() => import("./pages/dashboard/Alerts"));
const CriticalAlerts = lazy(() => import("./pages/dashboard/CriticalAlerts"));
const AlertRules = lazy(() => import("./pages/dashboard/AlertRules"));
const AlertDetails = lazy(() => import("./pages/dashboard/AlertDetails"));
const EvidenceVault = lazy(() => import("./pages/dashboard/EvidenceVault"));
const Recordings = lazy(() => import("./pages/dashboard/Recordings"));
const Cameras = lazy(() => import("./pages/dashboard/Cameras"));
const CameraHealth = lazy(() => import("./pages/dashboard/CameraHealth"));
const CameraLogs = lazy(() => import("./pages/dashboard/CameraLogs"));
const Analytics = lazy(() => import("./pages/dashboard/Analytics"));
const RiskScore = lazy(() => import("./pages/dashboard/RiskScore"));
const AIModelMetrics = lazy(() => import("./pages/dashboard/AIModelMetrics"));
const UsersManagement = lazy(() => import("./pages/dashboard/UsersManagement"));
const AuditLogs = lazy(() => import("./pages/dashboard/AuditLogs"));
const Settings = lazy(() => import("./pages/dashboard/Settings"));
const AlertConfig = lazy(() => import("./pages/dashboard/AlertConfig"));
const RecordingPolicies = lazy(() => import("./pages/dashboard/RecordingPolicies"));
const NotificationSettings = lazy(() => import("./pages/dashboard/NotificationSettings"));
const StorageManagement = lazy(() => import("./pages/dashboard/StorageManagement"));
const Profile = lazy(() => import("./pages/dashboard/Profile"));
const AccountSettings = lazy(() => import("./pages/dashboard/AccountSettings"));
const SystemHealth = lazy(() => import("./pages/dashboard/SystemHealth"));

const queryClient = new QueryClient();

import { LoadingOverlay } from "./components/ui/LoadingOverlay";

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="h-full w-full flex items-center justify-center p-20 opacity-50"><LoadingOverlay text="INITIALIZING SUBSYSTEM..." /></div>}>{children}</Suspense>
);

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SimulationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route index element={<S><DashboardIndex /></S>} />
                  <Route path="live" element={<S><LiveMonitoring /></S>} />
                  <Route path="grid" element={<S><MultiCameraGrid /></S>} />
                  <Route path="timeline" element={<S><IncidentTimeline /></S>} />
                  <Route path="alerts" element={<S><Alerts /></S>} />
                  <Route path="critical-alerts" element={<S><CriticalAlerts /></S>} />
                  <Route path="alert-rules" element={<S><AlertRules /></S>} />
                  <Route path="alerts/:id" element={<S><AlertDetails /></S>} />
                  <Route path="evidence" element={<S><EvidenceVault /></S>} />
                  <Route path="recordings" element={<S><Recordings /></S>} />
                  <Route path="cameras" element={<S><Cameras /></S>} />
                  <Route path="camera-health" element={<S><CameraHealth /></S>} />
                  <Route path="camera-logs" element={<S><CameraLogs /></S>} />
                  <Route path="analytics" element={<S><Analytics /></S>} />
                  <Route path="risk-score" element={<S><RiskScore /></S>} />
                  <Route path="ai-metrics" element={<ProtectedRoute requireAdmin><S><AIModelMetrics /></S></ProtectedRoute>} />
                  <Route path="users" element={<ProtectedRoute requireAdmin><S><UsersManagement /></S></ProtectedRoute>} />
                  <Route path="audit-logs" element={<ProtectedRoute requireAdmin><S><AuditLogs /></S></ProtectedRoute>} />
                  <Route path="settings" element={<ProtectedRoute requireAdmin><S><Settings /></S></ProtectedRoute>} />
                  <Route path="alert-config" element={<ProtectedRoute requireAdmin><S><AlertConfig /></S></ProtectedRoute>} />
                  <Route path="recording-policies" element={<ProtectedRoute requireAdmin><S><RecordingPolicies /></S></ProtectedRoute>} />
                  <Route path="notification-settings" element={<S><NotificationSettings /></S>} />
                  <Route path="storage" element={<ProtectedRoute requireAdmin><S><StorageManagement /></S></ProtectedRoute>} />
                  <Route path="profile" element={<S><Profile /></S>} />
                  <Route path="account-settings" element={<S><AccountSettings /></S>} />
                  <Route path="system-health" element={<S><SystemHealth /></S>} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SimulationProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
