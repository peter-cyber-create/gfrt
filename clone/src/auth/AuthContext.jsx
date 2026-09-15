import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/index.js";
import { hasAnyPermission, NAV_PERMISSIONS } from "../data/permissions.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getSession());

  useEffect(() => {
    authService.persistSession(user);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      permissions: user?.permissions || [],
      can(permissionId) {
        return authService.can(user, permissionId);
      },
      canAccessPath(path) {
        const required = NAV_PERMISSIONS[path];
        return hasAnyPermission(user?.permissions || [], required);
      },
      async login(email, password) {
        const result = await authService.login(email, password);
        if (result.ok) setUser(result.user);
        return result;
      },
      async logout() {
        await authService.logout(user);
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
