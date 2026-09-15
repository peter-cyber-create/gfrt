import { pushAudit, store } from "./store.js";

function delay(ms = 20) {
  return new Promise((r) => setTimeout(r, ms));
}

export const mockNotificationService = {
  async list() {
    await delay();
    return [...store.notifications];
  },

  async unreadCount() {
    const list = await this.list();
    return list.filter((n) => n.unread).length;
  },

  async markAllRead(actor = "Demo User") {
    await delay();
    store.notifications.forEach((n) => {
      n.unread = false;
    });
    pushAudit({
      user: actor,
      action: "notification.mark_all_read",
      entity: "notification",
      entityId: "all",
    });
    return [...store.notifications];
  },
};

export const mockAuditService = {
  async list(limit = 50) {
    await delay();
    return store.auditLogs.slice(0, limit);
  },

  async record(entry) {
    return pushAudit(entry);
  },
};
