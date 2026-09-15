import { pushAudit, store } from "./store.js";

function delay(ms = 40) {
  return new Promise((r) => setTimeout(r, ms));
}

export const mockUserService = {
  async list(filters = {}) {
    await delay();
    let rows = [...store.users];
    const q = (filters.query || "").trim().toLowerCase();
    if (q) {
      rows = rows.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (filters.role && filters.role !== "All") rows = rows.filter((u) => u.role === filters.role);
    if (filters.status && filters.status !== "All") rows = rows.filter((u) => u.status === filters.status);
    return rows;
  },

  async getById(id) {
    await delay();
    return store.users.find((u) => u.id === id) || null;
  },

  async create(payload, actor = "Demo Admin") {
    await delay();
    const id = Math.max(0, ...store.users.map((u) => Number(u.id))) + 1;
    const user = {
      id,
      name: payload.name,
      email: payload.email,
      role: payload.role || "Facility",
      department: payload.department || "Health Systems",
      status: "Active",
      lastActivity: "—",
      phone: payload.phone || "—",
    };
    store.users.unshift(user);
    pushAudit({ user: actor, action: "user.create", entity: "user", entityId: id, metadata: { email: user.email } });
    return user;
  },

  async update(id, payload, actor = "Demo Admin") {
    await delay();
    const idx = store.users.findIndex((u) => u.id === id);
    if (idx < 0) return null;
    store.users[idx] = { ...store.users[idx], ...payload };
    pushAudit({ user: actor, action: "user.update", entity: "user", entityId: id });
    return store.users[idx];
  },

  async disable(id, actor = "Demo Admin") {
    await delay();
    const user = store.users.find((u) => u.id === id);
    if (!user) return null;
    user.status = "Disabled";
    pushAudit({ user: actor, action: "user.disable", entity: "user", entityId: id, metadata: { name: user.name } });
    return user;
  },
};
