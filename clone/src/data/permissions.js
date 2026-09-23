/**
 * Proposed application permissions — NOT verified against production.
 * Used by the presentation RBAC model and future API integration.
 */

/** @type {import('../types/domain.js').Permission[]} */
export const PERMISSIONS = [
  { id: "requisition.view", label: "View requisitions", group: "requisition" },
  { id: "requisition.create", label: "Create requisitions", group: "requisition" },
  { id: "requisition.edit", label: "Edit requisitions", group: "requisition" },
  { id: "requisition.submit", label: "Submit requisitions", group: "requisition" },
  { id: "requisition.approve", label: "Approve requisitions", group: "requisition" },
  { id: "requisition.reject", label: "Reject requisitions", group: "requisition" },
  { id: "report.view", label: "View reports", group: "report" },
  { id: "report.export", label: "Export reports", group: "report" },
  { id: "user.view", label: "View users", group: "user" },
  { id: "user.manage", label: "Manage users", group: "user" },
  { id: "role.view", label: "View roles", group: "role" },
  { id: "role.manage", label: "Manage roles", group: "role" },
  { id: "settings.view", label: "View settings", group: "settings" },
  { id: "audit.view", label: "View audit log", group: "audit" },
];

export const ALL_PERMISSION_IDS = PERMISSIONS.map((p) => p.id);

/** Nav item → required permission (any-of). Missing entry = always visible when authenticated. */
export const NAV_PERMISSIONS = {
  "/home": null,
  "/requisitions": ["requisition.view"],
  "/performance": ["report.view"],
  "/users": ["user.view"],
  "/roles": ["role.view"],
  "/reports": ["report.view"],
  "/analytics": ["report.view"],
  "/settings": ["settings.view"],
};

/**
 * Proposed role → permission grants for demo RBAC.
 * Administrator receives every permission.
 */
export const ROLE_PERMISSIONS = {
  Administrator: [...ALL_PERMISSION_IDS],
  District: [
    "requisition.view",
    "requisition.approve",
    "requisition.reject",
    "report.view",
    "report.export",
    "user.view",
  ],
  Facility: [
    "requisition.view",
    "requisition.create",
    "requisition.edit",
    "requisition.submit",
    "report.view",
  ],
  /** Presentation “User” account — facility-operator capabilities */
  User: [
    "requisition.view",
    "requisition.create",
    "requisition.edit",
    "requisition.submit",
    "report.view",
    "settings.view",
  ],
  /** Presentation “Reviewer” — review/approve without user administration */
  Reviewer: [
    "requisition.view",
    "requisition.approve",
    "requisition.reject",
    "report.view",
    "report.export",
    "settings.view",
  ],
  Viewer: ["requisition.view", "report.view"],
};

export function permissionsForRole(roleName) {
  return ROLE_PERMISSIONS[roleName] || ROLE_PERMISSIONS.Viewer;
}

export function hasPermission(userPermissions, permissionId) {
  if (!permissionId) return true;
  const set = new Set(userPermissions || []);
  return set.has(permissionId);
}

export function hasAnyPermission(userPermissions, permissionIds) {
  if (!permissionIds || permissionIds.length === 0) return true;
  return permissionIds.some((id) => hasPermission(userPermissions, id));
}
