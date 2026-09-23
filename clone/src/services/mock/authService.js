import { permissionsForRole } from "../../data/permissions.js";
import { DEMO_MODE } from "../../data/config.js";
import { users } from "../../data/mock.js";
import { pushAudit } from "./store.js";

const STORAGE_KEY = "musooka_clone_session";

/**
 * Public presentation accounts for GitHub Pages / local demo only.
 * Intentionally non-secret — never use these patterns for real systems.
 */
export const DEMO_PRESENTATION_ACCOUNTS = [
  {
    id: "admin",
    label: "Administrator",
    username: "admin",
    password: "Admin123!",
    role: "Administrator",
    profileEmail: "amina.okello@demo.local",
  },
  {
    id: "reviewer",
    label: "Reviewer",
    username: "reviewer",
    password: "Review123!",
    role: "Reviewer",
    profileEmail: "david.mugisha@demo.local",
  },
  {
    id: "user",
    label: "User",
    username: "user",
    password: "User123!",
    role: "User",
    profileEmail: "christine.namuli@demo.local",
  },
];

function normalizeIdentity(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function findPresentationAccount(identity, password) {
  const id = normalizeIdentity(identity);
  return DEMO_PRESENTATION_ACCOUNTS.find(
    (a) => a.password === password && (normalizeIdentity(a.username) === id || normalizeIdentity(`${a.username}@demo.local`) === id)
  );
}

function sessionFromAccount(account) {
  const profile =
    users.find((u) => normalizeIdentity(u.email) === normalizeIdentity(account.profileEmail)) ||
    users.find((u) => u.role === account.role) ||
    users[0];
  return {
    id: profile.id,
    email: account.username,
    name: profile.name,
    role: account.role,
    department: profile.department,
    permissions: permissionsForRole(account.role),
  };
}

/** Legacy single-account login used by existing Playwright defaults. */
function legacyDemoLogin(identity, password) {
  const expectedEmail = import.meta.env.VITE_DEMO_EMAIL || "admin@gmail.com";
  const expectedPassword = import.meta.env.VITE_DEMO_PASSWORD || "123456";
  if (normalizeIdentity(identity) !== normalizeIdentity(expectedEmail) || password !== expectedPassword) {
    return null;
  }
  const profile = users.find((u) => u.role === "Administrator") || users[0];
  return {
    id: profile.id,
    email: expectedEmail,
    name: profile.name,
    role: "Administrator",
    department: profile.department,
    permissions: permissionsForRole("Administrator"),
  };
}

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

    const presentation = findPresentationAccount(email, password);
    const next = presentation ? sessionFromAccount(presentation) : legacyDemoLogin(email, password);

    if (!next) {
      return { ok: false, message: "These credentials do not match our records." };
    }

    this.persistSession(next);
    pushAudit({
      user: next.name,
      action: "login",
      entity: "session",
      entityId: "local",
      metadata: { demo: true, role: next.role },
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

  async requestPasswordReset() {
    return { data: { ok: true } };
  },

  async confirmPasswordReset() {
    return { data: { ok: true } };
  },
};
