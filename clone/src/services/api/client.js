/**
 * Production API client — used when VITE_DEMO_MODE=false and VITE_DATA_SOURCE=api.
 * Demo mode must never call this against production hosts.
 */
import { DEMO_MODE, STATUS_CODE_TO_LABEL } from "../../data/config.js";
import {
  buildDepartmentPerformance,
  buildOverTimeSeries,
  buildProcessingTimeSeries,
  buildStatusDistribution,
  computeMetricsFromRequisitions,
  filterRequisitions,
  formatAmount,
} from "./reportMetrics.js";

// Empty base → same-origin `/api/...` (staging via nginx). Set VITE_API_BASE_URL for split dev (e.g. :5173 → :4000).
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

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
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    const err = new Error("Network error — unable to reach the API.");
    err.status = 0;
    err.code = "NETWORK_ERROR";
    throw err;
  }

  if (res.status === 204) return { ok: true, data: null };

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.includes("/auth/login") && !path.includes("/password-reset")) {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch {
        /* ignore */
      }
      try {
        window.dispatchEvent(new CustomEvent("musooka:auth-expired"));
      } catch {
        /* ignore */
      }
    }
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
  const roleId = row.userRoles?.[0]?.role?.id || row.userRoles?.[0]?.roleId || row.roleId || null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: roleName,
    roleId,
    roles: row.roles || (roleName ? [roleName] : []),
    department: row.department?.name || row.department || row.departmentId || "—",
    departmentId: row.department?.id || row.departmentId || null,
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

  async requestPasswordReset(email) {
    return requestPasswordReset(email);
  },

  async confirmPasswordReset(token, password) {
    return confirmPasswordReset(token, password);
  },
};

function mapRequisition(row) {
  if (!row) return null;
  const statusCode = row.status;
  const amountRaw = row.amountValue ?? row.amount;
  const requiredAt = row.requiredAt || row.requiredDate || "";
  const history = (row.history || []).map((h) => ({
    id: h.id,
    fromStatus: h.fromStatus,
    toStatus: h.toStatus,
    fromLabel: STATUS_CODE_TO_LABEL[h.fromStatus] || h.fromStatus,
    toLabel: STATUS_CODE_TO_LABEL[h.toStatus] || h.toStatus,
    actor: typeof h.actor === "string" ? h.actor : h.actor?.name || "System",
    at: h.createdAt || h.at || "",
    note: h.note || "",
  }));
  const approvals = (row.approvals || []).map((a) => {
    const comment = a.comment || a.note || "";
    return {
      id: a.id,
      decision: a.decision || a.action || a.toStatus || "",
      actor: typeof a.actor === "string" ? a.actor : a.actor?.name || "System",
      at: a.createdAt || a.at || "",
      note: comment,
      comment,
    };
  });
  const comments = [
    ...history.filter((h) => h.note).map((h) => ({ id: `h-${h.id}`, actor: h.actor, text: h.note, at: h.at })),
    ...approvals.filter((a) => a.comment).map((a) => ({ id: `a-${a.id}`, actor: a.actor, text: a.comment, at: a.at })),
  ];
  return {
    id: row.id,
    number: row.number,
    facility: row.facility,
    district: row.district,
    department: row.department?.name || row.departmentId,
    departmentId: row.departmentId,
    statusCode,
    status: STATUS_CODE_TO_LABEL[statusCode] || statusCode,
    amount: formatAmount(amountRaw),
    amountValue: amountRaw,
    description: row.description,
    requester: row.requester?.name || row.requesterId,
    requesterId: row.requesterId,
    submitted: row.submittedAt ? String(row.submittedAt).slice(0, 10) : "",
    updated: row.updatedAt ? String(row.updatedAt).slice(0, 10) : "",
    requiredDate: requiredAt ? String(requiredAt).slice(0, 10) : "",
    requiredAt,
    items: row.items || [],
    history,
    approvals,
    comments,
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

export const apiDepartmentService = {
  async list() {
    const payload = await api("/api/v1/departments");
    return (payload.data || []).map((d) => ({ id: d.id, name: d.name }));
  },
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
    else if (filters.department && filters.department !== "All") {
      try {
        const depts = await apiDepartmentService.list();
        const match = depts.find((d) => d.name === filters.department);
        if (match) params.set("departmentId", match.id);
      } catch {
        /* fall through; client-side filter below */
      }
    }
    const qs = params.toString();
    const payload = await api(`/api/v1/requisitions${qs ? `?${qs}` : ""}`);
    let rows = (payload.data || []).map(mapRequisition);

    if (filters.department && filters.department !== "All" && !params.has("departmentId")) {
      rows = rows.filter((r) => r.department === filters.department);
    }
    if (filters.dateFrom) {
      rows = rows.filter((r) => !r.updated || r.updated >= filters.dateFrom || (r.submitted && r.submitted >= filters.dateFrom));
    }
    const sortKey = filters.sort || "updated";
    const dir = filters.sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return rows;
  },

  async getById(id) {
    const payload = await api(`/api/v1/requisitions/${id}`);
    return mapRequisition(payload.data);
  },

  async create(input) {
    const payload = await api("/api/v1/requisitions", { method: "POST", body: input });
    const id = payload.data?.id;
    if (id) return this.getById(id);
    return mapRequisition(payload.data);
  },

  async transition(id, toCode, { note = "" } = {}) {
    const action = ACTION_BY_STATUS[toCode];
    if (!action) return { ok: false, message: `Unknown status ${toCode}` };
    try {
      await api(`/api/v1/requisitions/${id}/${action}`, {
        method: "POST",
        body: { note },
      });
      const requisition = await this.getById(id);
      return { ok: true, requisition };
    } catch (err) {
      return { ok: false, message: err.message, status: err.status };
    }
  },

  async confirmLocal() {
    return { ok: true };
  },
};

export const apiUserService = {
  async list(filters = {}) {
    const payload = await api("/api/v1/users");
    let rows = (payload.data || []).map(mapUser);
    const q = (filters.query || "").trim().toLowerCase();
    if (q) {
      rows = rows.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (filters.role && filters.role !== "All") rows = rows.filter((u) => u.role === filters.role);
    if (filters.status && filters.status !== "All") {
      rows = rows.filter((u) => u.status === filters.status || u.statusCode === filters.status);
    }
    return rows;
  },
  async getById(id) {
    const payload = await api(`/api/v1/users/${id}`);
    return mapUser(payload.data);
  },
  async create(input) {
    if (!input.password || String(input.password).length < 8) {
      throw new Error("A password of at least 8 characters is required.");
    }
    const body = {
      email: input.email,
      name: input.name,
      password: input.password,
      roleId: input.roleId,
      departmentId: input.departmentId || undefined,
      phone: input.phone || undefined,
    };
    if (!body.roleId) throw new Error("roleId is required to create a user.");
    const payload = await api("/api/v1/users", { method: "POST", body });
    return mapUser(payload.data);
  },
  async update(id, input) {
    const body = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.phone !== undefined) body.phone = input.phone;
    if (input.departmentId !== undefined) body.departmentId = input.departmentId;
    if (input.roleId !== undefined) body.roleId = input.roleId;
    const payload = await api(`/api/v1/users/${id}`, { method: "PATCH", body });
    return mapUser(payload.data);
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
  const users = row._count?.userRoles ?? row.userCount ?? row.users ?? 0;
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    permissions: (row.rolePermissions || []).map((rp) => rp.permission?.code || rp.permissionId),
    userCount: users,
    users,
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

const PREFS_KEY = "musooka_api_preferences";

function defaultPreferences() {
  return {
    density: "comfortable",
    emailDigest: true,
    inAppNotifications: true,
    compactTables: false,
    defaultLanding: "/home",
  };
}

async function loadMappedRequisitions() {
  return apiRequisitionService.list({});
}

async function loadActivities() {
  // Activities are audit-derived; callers without audit.view get an empty list (not fake data).
  try {
    const rows = await apiAuditService.list(8);
    return rows.map((a) => ({
      id: a.id,
      type: "audit",
      title: a.action,
      detail: `${a.entity || ""} ${a.entityId || ""}`.trim() || a.actor,
      time: a.time,
    }));
  } catch (err) {
    if (err?.status === 403) return [];
    throw err;
  }
}

export const apiReportService = {
  async listCatalog(category = "All") {
    const payload = await api("/api/v1/reports/catalog");
    const rows = (payload.data || []).map((r) => ({
      id: r.id,
      title: r.title || r.name,
      name: r.name || r.title,
      category: r.category || "Operations",
      description: r.description || "",
      updated: r.updated || "—",
      proposed: r.proposed,
    }));
    if (category === "All") return rows;
    return rows.filter((r) => r.category === category);
  },

  async getDashboard() {
    const rows = await loadMappedRequisitions();
    const metrics = computeMetricsFromRequisitions(rows);
    const byStatus = buildStatusDistribution(rows);
    const byDepartment = buildDepartmentPerformance(rows);
    const overTime = buildOverTimeSeries(rows);
    const activities = await loadActivities();
    return {
      metrics,
      charts: {
        overTime,
        byStatus,
        byDepartment,
        processingTime: buildProcessingTimeSeries(rows),
      },
      activities,
      recentRequisitions: rows.slice(0, 5).map((r) => ({
        ...r,
        amount: formatAmount(r.amountValue ?? r.amount),
      })),
    };
  },

  async getPerformance() {
    const rows = await loadMappedRequisitions();
    return {
      metrics: computeMetricsFromRequisitions(rows),
      processingTime: buildProcessingTimeSeries(rows),
      byDepartment: buildDepartmentPerformance(rows),
      overTime: buildOverTimeSeries(rows),
    };
  },

  async getAnalytics({ department = "All", status = "All", period, dateFrom, dateTo } = {}) {
    const all = await loadMappedRequisitions();
    const rows = filterRequisitions(all, { department, status, period, dateFrom, dateTo });
    return {
      metrics: computeMetricsFromRequisitions(rows),
      byStatus: buildStatusDistribution(rows),
      byDepartment: buildDepartmentPerformance(rows),
      overTime: buildOverTimeSeries(rows),
      rows,
      departments: [...new Set(all.map((r) => r.department).filter(Boolean))].sort(),
    };
  },

  async exportCsv({ department = "All", status = "All", period, dateFrom, dateTo } = {}) {
    const all = await loadMappedRequisitions();
    const rows = filterRequisitions(all, { department, status, period, dateFrom, dateTo });
    const header = "id,number,facility,district,department,status,statusCode,amount,submitted,updated\n";
    const lines = rows
      .map((r) =>
        [
          r.id,
          r.number,
          r.facility,
          r.district,
          r.department,
          r.status,
          r.statusCode,
          r.amountValue ?? r.amount,
          r.submitted,
          r.updated,
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    return new Blob([header + lines], { type: "text/csv;charset=utf-8" });
  },

  async resetDemo() {
    const payload = await api("/api/v1/staging/presentation-reset", { method: "POST", body: {} });
    return payload.data;
  },

  async getPreferences() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      return raw ? { ...defaultPreferences(), ...JSON.parse(raw) } : defaultPreferences();
    } catch {
      return defaultPreferences();
    }
  },

  async savePreferences(prefs) {
    const next = { ...defaultPreferences(), ...prefs };
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    return next;
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
  async markAllRead() {
    const rows = await this.list();
    const unread = rows.filter((n) => n.unread);
    await Promise.all(
      unread.map((n) =>
        api(`/api/v1/notifications/${n.id}/read`, { method: "POST" }).catch(() => null)
      )
    );
    return this.list();
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
    return (payload.data || []).map((row) => {
      const time = row.createdAt ? String(row.createdAt).slice(0, 16).replace("T", " ") : "";
      const actor = row.actor?.name || row.actor?.email || row.actor || "System";
      return {
        id: row.id,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        actor,
        user: actor,
        time,
        timestamp: time,
        metadata: row.metadata,
      };
    });
  },
  async record() {
    return null;
  },
};
