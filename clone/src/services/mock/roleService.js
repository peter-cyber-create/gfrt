import { PERMISSIONS } from "../../data/permissions.js";
import { store } from "./store.js";

function delay(ms = 40) {
  return new Promise((r) => setTimeout(r, ms));
}

export const mockRoleService = {
  async list() {
    await delay();
    return [...store.roles];
  },

  async getById(id) {
    await delay();
    return store.roles.find((r) => r.id === id) || null;
  },

  async listPermissions() {
    await delay();
    return [...PERMISSIONS];
  },
};
