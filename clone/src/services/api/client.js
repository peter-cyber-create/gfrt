/**
 * Production API client — used when VITE_DEMO_MODE=false and VITE_DATA_SOURCE=api.
 * Demo mode must never call this against production hosts.
 */
import { DEMO_MODE, STATUS_CODE_TO_LABEL } from "../../data/config.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:4000";

const USER_STATUS_TO_LABEL = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  DISABLED: "Disabled",
};

function assertApiAllowed() {
  if (DEMO_MODE) {
    throw new Error("API services are disabled while VITE_DEMO_MODE=true.");
  }
}

async function api(path, { method = "GET", body, headers } = {}) {
  assertApiAllowed();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return { ok: true, data: null };

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload?.error?.message || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.code = payload?.error?.code;
    err.payload = payload;
    throw err;
  }
  return payload;
}

const SESSION_KEY = "musooka_api_user";

function mapUser(row) {
  if (!row) return null;
  const roleName = row.userRoles?.[0]?.role?.name || row.role || row.roles?.[0] || null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: roleName,
    roles: row.roles || (roleName ? [roleName] : []),
    department: row.department?.name || row.department || row.departmentId || "—",
    departmentId: row.department?.id || row.departmentId,
    status: USER_STATUS_TO_LABEL[row.status] || row.status,
    statusCode: row.status,
    lastActivity: row.lastLoginAt
      ? String(row.lastLoginAt).slice(0, 16).replace("T", " ")
      : row.lastActivity || "—",
    phone: row.phone || "—",
    permissions: row.permissions || [],
  };
}

export const apiAuthService = {
  getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  persistSession(user) {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  },

  async login(email, password) {
    try {
      const payload = await api("/api/v1/auth/login", {
        method: "POST",
        body: { email, password },
      });
      const user = mapUser({
        ...payload.data.user,
        role: payload.data.user.role || payload.data.user.roles?.[0],
        permissions: payload.data.user.permissions || [],
      });
      this.persistSession(user);
      return { ok: true, user };
    } catch (err) {
      return { ok: false, message: err.message || "Login failed" };
    }
  },

  async logout() {
    try {
      await api("/api/v1/auth/logout", { method: "POST" });
    } finally {
      this.persistSession(null);
    }
  },

  async refresh() {
    const payload = await api("/api/v1/auth/me");
    const user = mapUser(payload.data.user);
    this.persistSession(user);
    return user;
  },

  can(user, permissionId) {
    if (!permissionId) return true;
    return (user?.permissions || []).includes(permissionId);
  },
};

function mapRequisition(row) {
  if (!row) return null;
  const statusCode = row.status;
  return {
    id: row.id,
    number: row.number,
    facility: row.facility,
    district: row.district,
    department: row.department?.name || row.departmentId,
    departmentId: row.departmentId,
    statusCode,
    status: STATUS_CODE_TO_LABEL[statusCode] || statusCode,
    amount: row.amountValue,
    amountValue: row.amountValue,
    description: row.description,
    requester: row.requester?.name || row.requesterId,
    requesterId: row.requesterId,
    submitted: row.submittedAt ? String(row.submittedAt).slice(0, 10) : "",
    updated: row.updatedAt ? String(row.updatedAt).slice(0, 10) : "",
    items: row.items || [],
    history: (row.history || []).map((h) => ({
      ...h,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      fromLabel: STATUS_CODE_TO_LABEL[h.fromStatus] || h.fromStatus,
      toLabel: STATUS_CODE_TO_LABEL[h.toStatus] || h.toStatus,
    })),
    approvals: row.approvals || [],
  };
}

const ACTION_BY_STATUS = {
  SUBMITTED: "submit",
  UNDER_REVIEW: "review",
  APPROVED: "approve",
  REJECTED: "reject",
  PROCESSING: "startProcessing",
  COMPLETED: "complete",
  CANCELLED: "cancel",
};

export const apiRequisitionService = {
  async list(filters = {}) {
    const params = new URLSearchParams();
    if (filters.query) params.set("query", filters.query);
    if (filters.status && filters.status !== "All") {
      const code = Object.entries(STATUS_CODE_TO_LABEL).find(([, label]) => label === filters.status)?.[0];
      params.set("status", code || filters.status);
    }
    if (filters.departmentId) params.set("departmentId", filters.departmentId);
    const qs = params.toString();
    const payload = await api(`/api/v1/requisitions${qs ? `?${qs}` : ""}`);
    return (payload.data || []).map(mapRequisition);
  },

  async getById(id) {
    const payload = await api(`/api/v1/requisitions/${id}`);
    return mapRequisition(payload.data);
  },

  async transition(id, toCode, { note = "" } = {}) {
    const action = ACTION_BY_STATUS[toCode];
    if (!action) return { ok: false, message: `Unknown status ${toCode}` };
    try {
      const payload = await api(`/api/v1/requisitions/${id}/${action}`, {
        method: "POST",
        body: { note },
      });
      return { ok: true, requisition: mapRequisition(payload.data) };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  },

  async confirmLocal() {
    return { ok: true };
  },
};

export const apiUserService = {
  async list() {
    const payload = await api("/api/v1/users");
    return (payload.data || []).map(mapUser);
  },
  async getById(id) {
    const payload = await api(`/api/v1/users/${id}`);
    return mapUser(payload.data);
  },
  async create(input) {
    const payload = await api("/api/v1/users", { method: "POST", body: input });
    return mapUser(payload.data);
  },
  async update() {
    throw new Error("User profile update is not implemented in this phase.");
  },
  async disable(id) {
    const payload = await api(`/api/v1/users/${id}/status`, {
      method: "PATCH",
      body: { status: "DISABLED" },
    });
    return mapUser({ ...payload.data, status: payload.data.status });
  },
};

function mapRole(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    permissions: (row.rolePermissions || []).map((rp) => rp.permission?.code || rp.permissionId),
    userCount: row._count?.userRoles ?? row.userCount ?? 0,
  };
}

export const apiRoleService = {
  async list() {
    const payload = await api("/api/v1/roles");
    return (payload.data || []).map(mapRole);
  },
  async getById(id) {
    const rows = await this.list();
    return rows.find((r) => r.id === id) || null;
  },
  async listPermissions() {
    const payload = await api("/api/v1/permissions");
    return (payload.data || []).map((p) => ({
      id: p.id,
      code: p.code,
      label: p.label,
      group: p.groupName,
    }));
  },
};

export const apiReportService = {
  async listCatalog() {
    const payload = await api("/api/v1/reports/catalog");
    return payload.data;
  },
  async getDashboard() {
    const payload = await api("/api/v1/reports/dashboard");
    return payload.data;
  },
  async exportCsv() {
    throw new Error("CSV export is not implemented in this phase.");
  },
  async resetDemo() {
    throw new Error("Demo reset is not available in API mode.");
  },
};

function mapNotification(row) {
  return {
    id: row.id,
    text: row.text,
    unread: row.unread,
    time: row.createdAt ? String(row.createdAt).slice(0, 16).replace("T", " ") : "",
  };
}

export const apiNotificationService = {
  async list() {
    const payload = await api("/api/v1/notifications");
    return (payload.data || []).map(mapNotification);
  },
  async unreadCount() {
    const rows = await this.list();
    return rows.filter((n) => n.unread).length;
  },
};

export async function requestPasswordReset(email) {
  assertApiAllowed();
  const res = await fetch(`${API_BASE}/api/v1/auth/password-reset/request`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error?.message || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function confirmPasswordReset(token, password) {
  assertApiAllowed();
  const res = await fetch(`${API_BASE}/api/v1/auth/password-reset/confirm`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error?.message || `Request failed (${res.status})`);
  }
  return res.json();
}

export const apiAuditService = {
  async list(limit = 50) {
    const payload = await api(`/api/v1/audit-logs?limit=${limit}`);
    return (payload.data || []).map((row) => ({
      id: row.id,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      actor: row.actor?.name || row.actor?.email || "System",
      time: row.createdAt ? String(row.createdAt).slice(0, 16).replace("T", " ") : "",
      metadata: row.metadata,
    }));
  },
  async record() {
    return null;
  },
};
