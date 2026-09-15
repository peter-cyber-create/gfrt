import { permissionsForRole } from "../../data/permissions.js";
import { DEMO_MODE } from "../../data/config.js";
import { users } from "../../data/mock.js";
import { pushAudit } from "./store.js";

const STORAGE_KEY = "musooka_clone_session";

export const mockAuthService = {
  getSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  persistSession(user) {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Local presentation login only. Never calls production.
   */
  async login(email, password) {
    if (!DEMO_MODE && import.meta.env.VITE_DATA_SOURCE === "api") {
      throw new Error("API auth is not implemented. Use demo mode.");
    }

    const expectedEmail = import.meta.env.VITE_DEMO_EMAIL || "admin@gmail.com";
    const expectedPassword = import.meta.env.VITE_DEMO_PASSWORD || "123456";

    if (email.trim().toLowerCase() !== expectedEmail.toLowerCase() || password !== expectedPassword) {
      return { ok: false, message: "These credentials do not match our records." };
    }

    const profile = users.find((u) => u.role === "Administrator") || users[0];
    const role = "Administrator";
    const next = {
      id: profile.id,
      email: expectedEmail,
      name: profile.name,
      role,
      permissions: permissionsForRole(role),
    };

    this.persistSession(next);
    pushAudit({
      user: next.name,
      action: "login",
      entity: "session",
      entityId: "local",
      metadata: { demo: true },
    });
    return { ok: true, user: next };
  },

  async logout(user) {
    pushAudit({
      user: user?.name || "unknown",
      action: "logout",
      entity: "session",
      entityId: "local",
    });
    this.persistSession(null);
  },

  can(user, permissionId) {
    if (!permissionId) return true;
    return (user?.permissions || []).includes(permissionId);
  },
};
