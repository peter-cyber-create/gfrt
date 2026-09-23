import { permissionsForRole } from "../../data/permissions.js";
import { DEMO_MODE } from "../../data/config.js";
import { users } from "../../data/mock.js";
import { pushAudit } from "./store.js";

const STORAGE_KEY = "musooka_clone_session";
const PASSWORD_STORE_KEY = "musooka_demo_passwords";
const RESET_TOKEN_KEY = "musooka_demo_reset_tokens";

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

function legacyEmail() {
  return import.meta.env.VITE_DEMO_EMAIL || "admin@gmail.com";
}

function legacyPassword() {
  return import.meta.env.VITE_DEMO_PASSWORD || "123456";
}

function defaultPasswordMap() {
  const map = {};
  for (const account of DEMO_PRESENTATION_ACCOUNTS) {
    map[normalizeIdentity(account.username)] = account.password;
  }
  map[normalizeIdentity(legacyEmail())] = legacyPassword();
  return map;
}

function readPasswordMap() {
  try {
    const raw = localStorage.getItem(PASSWORD_STORE_KEY);
    if (!raw) return defaultPasswordMap();
    return { ...defaultPasswordMap(), ...JSON.parse(raw) };
  } catch {
    return defaultPasswordMap();
  }
}

function writePasswordMap(map) {
  localStorage.setItem(PASSWORD_STORE_KEY, JSON.stringify(map));
}

function storedPasswordFor(identity) {
  const map = readPasswordMap();
  return map[normalizeIdentity(identity)] || null;
}

function setStoredPassword(identity, password) {
  const map = readPasswordMap();
  map[normalizeIdentity(identity)] = password;
  writePasswordMap(map);
}

/** Restore presentation passwords (used by Reset Demo Data). */
export function resetDemoPasswords() {
  try {
    localStorage.removeItem(PASSWORD_STORE_KEY);
    localStorage.removeItem(RESET_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function findAccountByIdentity(identity) {
  const id = normalizeIdentity(identity);
  return (
    DEMO_PRESENTATION_ACCOUNTS.find(
      (a) =>
        normalizeIdentity(a.username) === id ||
        normalizeIdentity(`${a.username}@demo.local`) === id ||
        normalizeIdentity(a.profileEmail) === id
    ) || null
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

function legacySession() {
  const profile = users.find((u) => u.role === "Administrator") || users[0];
  return {
    id: profile.id,
    email: legacyEmail(),
    name: profile.name,
    role: "Administrator",
    department: profile.department,
    permissions: permissionsForRole("Administrator"),
  };
}

function validateNewPassword(password, confirm) {
  if (!password || String(password).length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (password !== confirm) {
    return "Passwords do not match.";
  }
  return null;
}

function readResetTokens() {
  try {
    const raw = localStorage.getItem(RESET_TOKEN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeResetTokens(tokens) {
  localStorage.setItem(RESET_TOKEN_KEY, JSON.stringify(tokens));
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

    const identity = normalizeIdentity(email);
    const expected = storedPasswordFor(identity);
    if (!expected || expected !== password) {
      return { ok: false, message: "These credentials do not match our records." };
    }

    const account = findAccountByIdentity(identity);
    const next = account
      ? sessionFromAccount(account)
      : identity === normalizeIdentity(legacyEmail())
        ? legacySession()
        : null;

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

  async changePassword(user, currentPassword, newPassword, confirmPassword) {
    if (!user?.email) {
      return { ok: false, message: "Not signed in." };
    }
    const identity = normalizeIdentity(user.email);
    const current = storedPasswordFor(identity);
    if (!current || current !== currentPassword) {
      return { ok: false, message: "Current password is incorrect." };
    }
    const invalid = validateNewPassword(newPassword, confirmPassword);
    if (invalid) return { ok: false, message: invalid };
    if (newPassword === currentPassword) {
      return { ok: false, message: "New password must be different from the current password." };
    }
    setStoredPassword(identity, newPassword);
    pushAudit({
      user: user.name,
      action: "auth.password_changed",
      entity: "user",
      entityId: String(user.id),
      metadata: { demo: true },
    });
    return { ok: true, message: "Password updated." };
  },

  async requestPasswordReset(email) {
    // Always succeed for enumeration safety.
    const account = findAccountByIdentity(email);
    const legacy = normalizeIdentity(email) === normalizeIdentity(legacyEmail());
    let demoResetPath = null;
    if (account || legacy) {
      const token = `demo-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      const tokens = readResetTokens();
      tokens[token] = {
        identity: account ? account.username : legacyEmail(),
        expiresAt: Date.now() + 60 * 60 * 1000,
      };
      writeResetTokens(tokens);
      demoResetPath = `/password/reset/confirm?token=${encodeURIComponent(token)}`;
      pushAudit({
        user: account?.username || legacyEmail(),
        action: "auth.password_reset_requested",
        entity: "user",
        entityId: "local",
        metadata: { demo: true },
      });
    }
    return { data: { ok: true, demoResetPath } };
  },

  async confirmPasswordReset(token, password, confirmPassword = password) {
    const invalid = validateNewPassword(password, confirmPassword);
    if (invalid) {
      throw new Error(invalid);
    }
    const tokens = readResetTokens();
    const entry = tokens[token];
    if (!entry || entry.expiresAt < Date.now()) {
      throw new Error("Invalid or expired reset token.");
    }
    setStoredPassword(entry.identity, password);
    delete tokens[token];
    writeResetTokens(tokens);
    pushAudit({
      user: entry.identity,
      action: "auth.password_reset_completed",
      entity: "user",
      entityId: "local",
      metadata: { demo: true },
    });
    return { data: { ok: true } };
  },

  /**
   * Admin may reset a presentation account password when the user email
   * maps to a known demo login identity.
   */
  async adminResetPassword(targetUser, temporaryPassword, actor = "Demo Admin") {
    if (!targetUser?.email) {
      return { ok: false, message: "User not found." };
    }
    const account = findAccountByIdentity(targetUser.email);
    if (!account) {
      return {
        ok: false,
        message: "Admin password reset applies to presentation login accounts only.",
      };
    }
    const invalid = validateNewPassword(temporaryPassword, temporaryPassword);
    if (invalid) return { ok: false, message: invalid };
    setStoredPassword(account.username, temporaryPassword);
    pushAudit({
      user: actor,
      action: "auth.admin_password_reset",
      entity: "user",
      entityId: String(targetUser.id),
      metadata: { demo: true, target: account.username },
    });
    return { ok: true, message: `Password reset for ${account.username}.` };
  },
};
