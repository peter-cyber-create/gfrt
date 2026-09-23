import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService, getDataSource } from "../services/index.js";
import { hasAnyPermission, NAV_PERMISSIONS } from "../data/permissions.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getSession());
  const [bootstrapping, setBootstrapping] = useState(() => getDataSource() === "api");

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (getDataSource() !== "api") {
        setBootstrapping(false);
        return;
      }
      try {
        const me = await authService.refresh();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) {
          authService.persistSession(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }
    bootstrap();

    function onExpired() {
      authService.persistSession(null);
      setUser(null);
    }
    window.addEventListener("musooka:auth-expired", onExpired);
    return () => {
      cancelled = true;
      window.removeEventListener("musooka:auth-expired", onExpired);
    };
  }, []);

  useEffect(() => {
    if (!bootstrapping) authService.persistSession(user);
  }, [user, bootstrapping]);

  const value = useMemo(
    () => ({
      user,
      bootstrapping,
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
      async changePassword(currentPassword, newPassword, confirmPassword) {
        if (typeof authService.changePassword !== "function") {
          return { ok: false, message: "Change password is not available in this mode." };
        }
        return authService.changePassword(user, currentPassword, newPassword, confirmPassword);
      },
    }),
    [user, bootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
