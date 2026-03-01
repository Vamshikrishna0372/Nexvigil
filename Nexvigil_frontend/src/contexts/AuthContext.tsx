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

  // Check token validity on mount (optional, or rely on API 401 interceptor)
  useEffect(() => {
    const token = localStorage.getItem("nexvigil_token");
    if (token && !user) {
      // Verify me
      api.auth.me().then(({ data, error }) => {
        if (data) setUser(data as any);
        else if (error) {
          localStorage.removeItem("nexvigil_token");
          localStorage.removeItem("nexvigil_user");
        }
      });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await api.auth.login(email, password);

    if (error || !data) {
      return { success: false, error: error || "Login failed" };
    }

    // Config matches Token schema: access_token, user
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

    // Auto login after register? Or redirect to login? 
    // Let's assume auto-login if backend returns token, or just return success so UI can redirect.
    // Backend register endpoint only returns UserResponse, not Token.
    // So we return success and let UI redirect to login or trigger login.

    // Wait, prompt says "navigate('/dashboard')" in Register.tsx on success.
    // That implies auto-login. But backend register returns UserResponse.
    // We should call login() here or change Register.tsx to redirect to /login.
    // Let's call login() here internally.

    return await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("nexvigil_user");
    localStorage.removeItem("nexvigil_token");
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
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
