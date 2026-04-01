import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { api } from "@/services/api";

export type UserRole = "admin" | "user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization_id?: string;
  org_role?: string;
  avatar?: string;
  alert_email?: string;
  alerts_enabled?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  isOrgAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("nexvigil_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  // Check token/session validity on mount
  useEffect(() => {
    const token = localStorage.getItem("nexvigil_token");
    
    const checkAuth = async () => {
      try {
        // 1. Check URL-based token handover (HIGHEST PRIORITY)
        const params = new URLSearchParams(window.location.search);
        const authSuccess = params.get("auth_success");
        const dataParam = params.get("data");

        if (authSuccess === "true" && dataParam) {
          try {
            const parsedStr = decodeURIComponent(dataParam);
            const parsedData = JSON.parse(parsedStr);
            console.log('✅ Auth success param detected, parsing data...');

            // The token can be in 'token' or 'access_token' depending on the auth source
            const authToken = parsedData.token || parsedData.access_token || parsedData.accessToken;
            const userData = parsedData.user || parsedData; 
            
            if (authToken) {
              console.log('🔑 Storing new auth token in localStorage');
              localStorage.setItem("nexvigil_token", authToken);
              
              const googleUser: AuthUser = {
                id: userData.id || userData._id || "google-user",
                name: userData.displayName || userData.name || "Google User",
                email: userData.email || "",
                avatar: userData.profilePicture || userData.avatar || "",
                role: (userData.role as UserRole) || "user"
              };
              
              setUser(googleUser);
              localStorage.setItem("nexvigil_user", JSON.stringify(googleUser));
              
              // Clean URL and finalize loading
              window.history.replaceState({}, document.title, window.location.pathname);
              setLoading(false);
              return;
            } else {
              console.warn('⚠️ auth_success was true but no token found in payload');
            }
          } catch (e) {
            console.error("❌ Auth handover failed:", e);
          }
        }

        // 2. Check local session (Token-based)
        if (token && !user) {
          const { data } = await api.auth.me();
          if (data) {
            setUser(data as any);
            setLoading(false);
            return;
          }
        }

        // 3. Fallback: Node Auth API (Cookies) - ONLY check if we don't have a user but might have a session indicator
        if (!user && (token || document.cookie.includes("connect.sid"))) {
            const result = await api.nodeAuth.getUser();
            if (result && result.authenticated && result.user) {
              const googleUser: AuthUser = {
                id: result.user._id || result.user.id || "google-user",
                name: result.user.displayName || "Google User",
                email: result.user.email || "",
                avatar: result.user.profilePicture || "",
                role: result.user.role || "user"
              };
              setUser(googleUser);
              localStorage.setItem("nexvigil_user", JSON.stringify(googleUser));
            }
        }
      } catch (err) {
        console.debug("Auth check finalized.");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await api.auth.login(email, password);

    if (error || !data) {
      return { success: false, error: error || "Login failed" };
    }

    const { access_token, user: userData } = data;

    if (!access_token || !userData) {
      return { success: false, error: "Invalid response from server" };
    }

    localStorage.setItem("nexvigil_token", access_token);
    localStorage.setItem("nexvigil_user", JSON.stringify(userData));
    setUser(userData);

    return { success: true };
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { data, error } = await api.auth.register(name, email, password);

    if (error || !data) {
      return { success: false, error: error || "Registration failed" };
    }

    return await login(email, password);
  }, [login]);

  const logout = useCallback(async () => {
    setUser(null);
    localStorage.removeItem("nexvigil_user");
    localStorage.removeItem("nexvigil_token");

    try {
      await api.nodeAuth.logout();
    } catch (err) {
      console.error("Logout error", err);
    }

    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      login,
      register,
      logout,
      isAdmin: user?.role === "admin",
      isOrgAdmin: user?.org_role === "org_admin"
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
