/**
 * Nexvigil API Service Layer
 * 
 * Centralized API abstraction for backend operations.
 */

// Fallback to localhost:8000 only if no environment variable is provided
// NOTE: For production (e.g. Vercel), the VITE_API_BASE_URL secret must be set in the dashbord.
const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  // Production safeguard: If on vercel/production and no API URL is set, we use a placeholder or relative path
  // but for Nexvigil, we definitely need the backend URL (often ngrok).
  if (window.location.hostname.includes("vercel.app")) {
    console.warn("VITE_API_BASE_URL is missing. API calls will likely fail. Please set it in Vercel settings.");
    return "/api/v1"; // Fallback to relative to avoid HTTPS/HTTP mismatch
  }

  return `http://${window.location.hostname}:8000/api/v1`;
};

export const API_BASE = getApiBase();

// Generic fetch wrapper with auth
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<{ data: T | null; error: string | null }> {
  try {
    const token = localStorage.getItem("nexvigil_token");
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        localStorage.removeItem("nexvigil_token");
        localStorage.removeItem("nexvigil_user");
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
      return { data: null, error: body.detail || body.message || `Request failed (${res.status})` };
    }

    const body = await res.json();
    return { data: body.data !== undefined ? body.data : body, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || "Network error" };
  }
}

export const api = {
  // Auth
  auth: {
    login: (username: string, password: string) => {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      return fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      }).then(async res => {
        if (!res.ok) {
          const err = await res.json();
          return { data: null, error: err.detail || "Login failed" };
        }
        return { data: await res.json(), error: null };
      });
    },
    register: (name: string, email: string, password: string) =>
      request("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
    me: () => request("/auth/me"),
    updateMe: (data: any) => request("/auth/me", { method: "PUT", body: JSON.stringify(data) }),
  },

  // Alerts
  alerts: {
    list: (params?: { severity?: string; camera_id?: string; skip?: number; limit?: number; acknowledged?: boolean }) =>
      request(`/alerts/?${new URLSearchParams(params as any).toString()}`),
    get: (id: string) => request(`/alerts/${id}`),
    acknowledge: (id: string) =>
      request(`/alerts/${id}/acknowledge`, { method: "PATCH" }),
    delete: (id: string) =>
      request(`/alerts/${id}`, { method: "DELETE" }),
    summary: () => request("/alerts/summary"),
  },

  // Cameras
  cameras: {
    list: () => request("/cameras/"),
    get: (id: string) => request(`/cameras/${id}`),
    create: (data: { camera_name: string; camera_url: string; location: string }) =>
      request("/cameras/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ camera_name: string; camera_url: string; location: string; status: string }>) =>
      request(`/cameras/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/cameras/${id}`, { method: "DELETE" }),
    health: (id: string) => request(`/cameras/${id}/health`),
    logs: (id: string) => request(`/cameras/${id}/logs`),
    streamUrl: (id: string) => `${API_BASE}/cameras/${id}/stream`,
  },

  // Rules
  rules: {
    list: () => request("/rules/"),
    create: (data: any) =>
      request("/rules/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request(`/rules/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request(`/rules/${id}`, { method: "DELETE" }),
  },

  // Analytics & Dashboard
  analytics: {
    riskScore: () => request("/analytics/risk-score"),
    trends: (metric: string = "alerts", days: number = 7) => request(`/analytics/trends?metric=${metric}&days=${days}`),
    detectionOverview: (params?: { days?: number; camera_id?: string; severity?: string }) =>
      request(`/analytics/alerts?${new URLSearchParams(params as any).toString()}`),
    anomalies: () => request("/anomalies/summary"),
  },

  // System (Admin only)
  system: {
    summary: () => request("/system/summary"), // Dashboard cards — real DB data
    health: () => request("/system/health"),   // System health metrics
    settings: {
      get: () => request("/system/system-settings"),
      update: (data: any) => request("/system/system-settings", { method: "PUT", body: JSON.stringify(data) }),
    },
    aiConfig: {
      get: () => request("/ai/config"),
      update: (data: any) => request("/ai/config", { method: "PUT", body: JSON.stringify(data) }),
      emailStatus: () => request("/ai/email-status"),
      emailTest: (recipient: string) => request("/ai/email-test", { method: "POST", body: JSON.stringify({ recipient }) }),
    },
    aiMetrics: () => request("/analytics/ai-metrics"),
    storage: () => request("/media/status"),
  },

  // Notifications
  notifications: {
    list: () => request("/notifications/"),
    markRead: (id: string) =>
      request(`/notifications/${id}/read`, { method: "PATCH" }),
    unreadCount: () => request("/notifications/unread-count"),
  },

  // Media (Static Access)
  media: {
    recordings: () => request("/media/recordings"),
    // Point directly to StaticFiles mount at /media
    getVideoUrl: (path: string) => {
      if (!path) return "";
      const base = API_BASE.replace(/\/api\/v1\/?$/, "");
      return `${base}/media/${path}?ngrok-skip-browser-warning=true`;
    },
    getScreenshotUrl: (path: string) => {
      if (!path) return "";
      const base = API_BASE.replace(/\/api\/v1\/?$/, "");
      return `${base}/media/${path}?ngrok-skip-browser-warning=true`;
    },
    getToken: () => localStorage.getItem("nexvigil_token") || ""
  },

  // Users (Admin)
  users: {
    list: () => request("/users/"),
    create: (data: any) => request("/users/", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/users/${id}`, { method: "DELETE" }),
  },

  // Audit
  audit: {
    logs: (limit: number = 100) => request(`/system/audit-logs?limit=${limit}`),
  }
};
