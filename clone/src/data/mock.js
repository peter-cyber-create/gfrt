import { DEPARTMENTS, DISTRICTS, STATUS_LABEL_TO_CODE } from "./config";
import { ROLE_PERMISSIONS } from "./permissions";

/** Fictional demo users — not production personal data. */
export const users = [
  { id: 1, name: "Amina Okello", email: "amina.okello@demo.local", role: "Administrator", department: "Health Systems", status: "Active", lastActivity: "2026-09-14 08:42", phone: "+256 700 000 001" },
  { id: 2, name: "Brian Ssekandi", email: "brian.ssekandi@demo.local", role: "District", department: "HIV/AIDS", status: "Active", lastActivity: "2026-09-13 16:10", phone: "+256 700 000 002" },
  { id: 3, name: "Christine Namuli", email: "christine.namuli@demo.local", role: "Facility", department: "Malaria", status: "Active", lastActivity: "2026-09-13 11:22", phone: "+256 700 000 003" },
  { id: 4, name: "David Mugisha", email: "david.mugisha@demo.local", role: "Reviewer", department: "TB/Leprosy", status: "Active", lastActivity: "2026-09-12 14:05", phone: "+256 700 000 004" },
  { id: 5, name: "Esther Akello", email: "esther.akello@demo.local", role: "Viewer", department: "Laboratory", status: "Inactive", lastActivity: "2026-08-28 09:18", phone: "+256 700 000 005" },
  { id: 6, name: "Francis Kato", email: "francis.kato@demo.local", role: "Facility", department: "Procurement", status: "Active", lastActivity: "2026-09-14 07:55", phone: "+256 700 000 006" },
  { id: 7, name: "Grace Nabirye", email: "grace.nabirye@demo.local", role: "District", department: "Health Systems", status: "Active", lastActivity: "2026-09-11 13:40", phone: "+256 700 000 007" },
  { id: 8, name: "Henry Wamala", email: "henry.wamala@demo.local", role: "Reviewer", department: "HIV/AIDS", status: "Disabled", lastActivity: "2026-07-19 10:02", phone: "+256 700 000 008" },
  { id: 9, name: "Irene Atim", email: "irene.atim@demo.local", role: "Facility", department: "TB/Leprosy", status: "Active", lastActivity: "2026-09-10 15:33", phone: "+256 700 000 009" },
  { id: 10, name: "James Ochieng", email: "james.ochieng@demo.local", role: "Viewer", department: "Malaria", status: "Active", lastActivity: "2026-09-09 12:12", phone: "+256 700 000 010" },
];

export const roles = [
  {
    id: 1,
    name: "Administrator",
    users: 2,
    description: "Full system administration including users, roles, and configuration.",
    permissions: [...ROLE_PERMISSIONS.Administrator],
  },
  {
    id: 2,
    name: "District",
    users: 6,
    description: "Review and approve facility requisitions within assigned districts.",
    permissions: [...ROLE_PERMISSIONS.District],
  },
  {
    id: 3,
    name: "Facility",
    users: 24,
    description: "Create and submit requisitions for the assigned facility.",
    permissions: [...ROLE_PERMISSIONS.Facility],
  },
  {
    id: 4,
    name: "Reviewer",
    users: 4,
    description: "Review performance indicators and comment on submissions.",
    permissions: [...ROLE_PERMISSIONS.Reviewer],
  },
  {
    id: 5,
    name: "Viewer",
    users: 8,
    description: "Read-only access to dashboards and published reports.",
    permissions: [...ROLE_PERMISSIONS.Viewer],
  },
];

/** Demo UserRole / RolePermission join data (proposed RBAC). */
export const userRoles = users.map((u) => ({
  userId: u.id,
  roleId: roles.find((r) => r.name === u.role)?.id,
}));

export const rolePermissions = roles.flatMap((r) =>
  r.permissions.map((permissionId) => ({ roleId: r.id, permissionId }))
);

const facilities = [
  "Mulago NRH",
  "Jinja RRH",
  "Mbarara RRH",
  "Gulu RRH",
  "Fort Portal RRH",
  "Soroti RRH",
  "Lira RRH",
  "Arua RRH",
  "Mbale RRH",
  "Masaka RRH",
];

function amount(n) {
  return `UGX ${n.toLocaleString("en-UG")}`;
}

function withLifecycle(row) {
  const statusCode = STATUS_LABEL_TO_CODE[row.status] || "SUBMITTED";
  const requiredDate = row.requiredDate || (() => {
    const d = new Date(row.submitted);
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  })();
  return {
    ...row,
    statusCode,
    requiredDate,
    comments: row.comments || [],
    items: row.items || [
      {
        id: `${row.id}-I1`,
        requisitionId: row.id,
        description: row.description,
        quantity: 1,
        unit: "lot",
        unitCost: row.amountValue,
      },
    ],
    approvals: row.approvals || [],
    history: row.history || [
      {
        id: `${row.id}-H0`,
        requisitionId: row.id,
        fromStatus: "DRAFT",
        toStatus: "SUBMITTED",
        actor: row.requester,
        at: `${row.submitted}T08:00:00`,
        note: "Created and submitted (demo)",
      },
      {
        id: `${row.id}-H1`,
        requisitionId: row.id,
        fromStatus: "SUBMITTED",
        toStatus: statusCode === "SUBMITTED" ? "SUBMITTED" : statusCode,
        actor: row.requester,
        at: `${row.updated}T10:00:00`,
        note: statusCode === "SUBMITTED" ? "Awaiting review" : `Moved to ${statusCode} (demo)`,
      },
    ].filter((h, i, arr) => !(h.fromStatus === h.toStatus && i > 0) || arr.length === 1),
  };
}

export const requisitions = [
  withLifecycle({ id: "REQ-2026-0148", facility: facilities[0], district: DISTRICTS[0], department: DEPARTMENTS[0], status: "Processing", amount: amount(12450000), amountValue: 12450000, submitted: "2026-09-10", updated: "2026-09-12", requester: "Christine Namuli", description: "ARV buffer stock for Q3 facility clinics." }),
  withLifecycle({ id: "REQ-2026-0147", facility: facilities[1], district: DISTRICTS[1], department: DEPARTMENTS[2], status: "Approved", amount: amount(8220000), amountValue: 8220000, submitted: "2026-09-09", updated: "2026-09-11", requester: "Francis Kato", description: "LLIN distribution campaign supplies.", approvals: [{ id: "AP-147", requisitionId: "REQ-2026-0147", actor: "Brian Ssekandi", decision: "APPROVED", at: "2026-09-11", comment: "Demo approval" }] }),
  withLifecycle({ id: "REQ-2026-0146", facility: facilities[2], district: DISTRICTS[2], department: DEPARTMENTS[1], status: "Under Review", amount: amount(5100000), amountValue: 5100000, submitted: "2026-09-08", updated: "2026-09-10", requester: "Irene Atim", description: "GeneXpert cartridges and consumables." }),
  withLifecycle({ id: "REQ-2026-0145", facility: facilities[3], district: DISTRICTS[3], department: DEPARTMENTS[3], status: "Submitted", amount: amount(3870000), amountValue: 3870000, submitted: "2026-09-07", updated: "2026-09-07", requester: "Christine Namuli", description: "HMIS data tools and training materials." }),
  withLifecycle({ id: "REQ-2026-0144", facility: facilities[4], district: DISTRICTS[4], department: DEPARTMENTS[4], status: "Rejected", amount: amount(2450000), amountValue: 2450000, submitted: "2026-09-06", updated: "2026-09-08", requester: "Francis Kato", description: "Incomplete supporting documentation.", approvals: [{ id: "AP-144", requisitionId: "REQ-2026-0144", actor: "Brian Ssekandi", decision: "REJECTED", at: "2026-09-08", comment: "Missing docs (demo)" }] }),
  withLifecycle({ id: "REQ-2026-0143", facility: facilities[5], district: DISTRICTS[5], department: DEPARTMENTS[0], status: "Completed", amount: amount(6900000), amountValue: 6900000, submitted: "2026-09-01", updated: "2026-09-09", requester: "Irene Atim", description: "Viral load sample transport kits." }),
  withLifecycle({ id: "REQ-2026-0142", facility: facilities[6], district: DISTRICTS[6], department: DEPARTMENTS[2], status: "Processing", amount: amount(4330000), amountValue: 4330000, submitted: "2026-09-04", updated: "2026-09-06", requester: "Christine Namuli", description: "RDT kits for outreach sessions." }),
  withLifecycle({ id: "REQ-2026-0141", facility: facilities[7], district: DISTRICTS[7], department: DEPARTMENTS[5], status: "Approved", amount: amount(7110000), amountValue: 7110000, submitted: "2026-09-03", updated: "2026-09-05", requester: "Francis Kato", description: "Cold-chain packaging for last-mile delivery." }),
  withLifecycle({ id: "REQ-2026-0140", facility: facilities[8], district: DISTRICTS[8], department: DEPARTMENTS[1], status: "Completed", amount: amount(9580000), amountValue: 9580000, submitted: "2026-08-28", updated: "2026-09-04", requester: "Irene Atim", description: "TB preventive therapy commodities." }),
  withLifecycle({ id: "REQ-2026-0139", facility: facilities[9], district: DISTRICTS[9], department: DEPARTMENTS[3], status: "Under Review", amount: amount(2760000), amountValue: 2760000, submitted: "2026-09-02", updated: "2026-09-03", requester: "Christine Namuli", description: "Facility mentoring visit logistics." }),
  withLifecycle({ id: "REQ-2026-0138", facility: facilities[0], district: DISTRICTS[0], department: DEPARTMENTS[4], status: "Approved", amount: amount(5320000), amountValue: 5320000, submitted: "2026-08-30", updated: "2026-09-01", requester: "Francis Kato", description: "Laboratory reagents for HIV testing." }),
  withLifecycle({ id: "REQ-2026-0137", facility: facilities[2], district: DISTRICTS[2], department: DEPARTMENTS[0], status: "Completed", amount: amount(8840000), amountValue: 8840000, submitted: "2026-08-20", updated: "2026-08-29", requester: "Irene Atim", description: "Adherence counseling support materials." }),
];

/** Mock audit log — fictional demo events only. */
export const auditLogs = [
  { id: "AUD-01", user: "Amina Okello", action: "login", entity: "session", entityId: "local", timestamp: "2026-09-14 08:00", metadata: { source: "demo" } },
  { id: "AUD-02", user: "Christine Namuli", action: "requisition.submit", entity: "requisition", entityId: "REQ-2026-0148", timestamp: "2026-09-14 07:50", metadata: { facility: "Mulago NRH" } },
  { id: "AUD-03", user: "Brian Ssekandi", action: "requisition.approve", entity: "requisition", entityId: "REQ-2026-0147", timestamp: "2026-09-14 08:15", metadata: {} },
  { id: "AUD-04", user: "Amina Okello", action: "user.disable", entity: "user", entityId: "8", timestamp: "2026-09-13 15:02", metadata: { name: "Henry Wamala" } },
  { id: "AUD-05", user: "David Mugisha", action: "report.generate", entity: "report", entityId: "RPT-01", timestamp: "2026-09-13 11:40", metadata: { period: "2026-08" } },
];

export const activities = [
  { id: "ACT-01", type: "approved", title: "Requisition approved", detail: "REQ-2026-0147 approved by Brian Ssekandi", time: "2026-09-14 08:15", actor: "Brian Ssekandi" },
  { id: "ACT-02", type: "submitted", title: "Requisition submitted", detail: "REQ-2026-0148 submitted from Mulago NRH", time: "2026-09-14 07:50", actor: "Christine Namuli" },
  { id: "ACT-03", type: "completed", title: "Requisition completed", detail: "REQ-2026-0143 marked completed", time: "2026-09-13 17:20", actor: "Amina Okello" },
  { id: "ACT-04", type: "user", title: "User status updated", detail: "Henry Wamala set to Disabled", time: "2026-09-13 15:02", actor: "Amina Okello" },
  { id: "ACT-05", type: "report", title: "Report generated", detail: "Monthly performance summary (Aug 2026)", time: "2026-09-13 11:40", actor: "David Mugisha" },
  { id: "ACT-06", type: "review", title: "Moved to review", detail: "REQ-2026-0146 under district review", time: "2026-09-12 16:45", actor: "Grace Nabirye" },
  { id: "ACT-07", type: "rejected", title: "Requisition rejected", detail: "REQ-2026-0144 returned for documentation", time: "2026-09-12 10:18", actor: "Brian Ssekandi" },
  { id: "ACT-08", type: "submitted", title: "Requisition submitted", detail: "REQ-2026-0145 submitted from Gulu RRH", time: "2026-09-11 09:05", actor: "Christine Namuli" },
];

export const dashboardMetrics = {
  total: 148,
  pending: 18,
  approved: 62,
  completed: 51,
  avgProcessingDays: 6.4,
  performanceRate: 87.5,
  trends: {
    total: { value: 4.2, direction: "up" },
    pending: { value: 1.1, direction: "down" },
    approved: { value: 3.8, direction: "up" },
    completed: { value: 2.4, direction: "up" },
    avgProcessingDays: { value: 0.6, direction: "down" },
    performanceRate: { value: 1.5, direction: "up" },
  },
};

export const chartSeries = {
  overTime: [
    { month: "Apr", submitted: 18, approved: 14, completed: 12 },
    { month: "May", submitted: 22, approved: 17, completed: 15 },
    { month: "Jun", submitted: 20, approved: 16, completed: 14 },
    { month: "Jul", submitted: 26, approved: 21, completed: 18 },
    { month: "Aug", submitted: 24, approved: 19, completed: 17 },
    { month: "Sep", submitted: 21, approved: 16, completed: 11 },
  ],
  byStatus: [
    { name: "Pending", value: 18 },
    { name: "Under Review", value: 12 },
    { name: "Approved", value: 62 },
    { name: "Completed", value: 51 },
    { name: "Rejected", value: 5 },
  ],
  byDepartment: [
    { department: "HIV/AIDS", rate: 91 },
    { department: "TB/Leprosy", rate: 86 },
    { department: "Malaria", rate: 88 },
    { department: "Health Systems", rate: 82 },
    { department: "Laboratory", rate: 84 },
    { department: "Procurement", rate: 79 },
  ],
  processingTime: [
    { week: "W1", days: 7.2 },
    { week: "W2", days: 6.8 },
    { week: "W3", days: 6.1 },
    { week: "W4", days: 5.9 },
  ],
};

export const notifications = [
  { id: "N1", text: "3 requisitions awaiting district review", unread: true, time: "20m ago" },
  { id: "N2", text: "August performance report is ready", unread: true, time: "2h ago" },
  { id: "N3", text: "User access review due this week", unread: false, time: "1d ago" },
];

export const reportCatalog = [
  { id: "RPT-01", title: "Monthly Performance Summary", category: "Performance", description: "Completion rates, turnaround, and backlog by programme.", updated: "2026-09-01" },
  { id: "RPT-02", title: "Requisitions by District", category: "Operations", description: "Volume and status distribution across districts.", updated: "2026-09-10" },
  { id: "RPT-03", title: "Approval Turnaround", category: "Performance", description: "Average days from submission to approval.", updated: "2026-09-08" },
  { id: "RPT-04", title: "User Activity Audit", category: "Administration", description: "Demo audit of local user actions (presentation only).", updated: "2026-09-12" },
];

/** Sidebar navigation — sectioned enterprise shell */
export const navSections = [
  {
    id: "main",
    label: null,
    items: [{ path: "/home", label: "Dashboard", icon: "fas fa-tachometer-alt" }],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { path: "/requisitions", label: "Requisitions", icon: "fas fa-file-alt" },
      { path: "/performance", label: "Performance", icon: "fas fa-chart-line" },
    ],
  },
  {
    id: "management",
    label: "Management",
    items: [
      { path: "/users", label: "Users", icon: "fas fa-users" },
      { path: "/roles", label: "Roles", icon: "fas fa-user-shield" },
    ],
  },
  {
    id: "reporting",
    label: "Reporting",
    items: [
      { path: "/reports", label: "Reports", icon: "fas fa-chart-bar" },
      { path: "/analytics", label: "Analytics", icon: "fas fa-chart-pie" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [{ path: "/settings", label: "Settings", icon: "fas fa-cog" }],
  },
];

export const pageTitles = {
  "/home": "Dashboard",
  "/requisitions": "Requisitions",
  "/performance": "Performance",
  "/users": "Users",
  "/roles": "Roles",
  "/reports": "Reports",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

/** Back-compat exports used by older imports */
export const navItems = navSections.flatMap((s) => s.items);
export const dashboardStats = [
  { label: "Total Requisitions", value: dashboardMetrics.total, tone: "primary", icon: "fas fa-folder-open" },
  { label: "Pending", value: dashboardMetrics.pending, tone: "warning", icon: "fas fa-clock" },
  { label: "Approved", value: dashboardMetrics.approved, tone: "success", icon: "fas fa-check-circle" },
  { label: "Completed", value: dashboardMetrics.completed, tone: "info", icon: "fas fa-flag-checkered" },
];
export const recentRequisitions = requisitions;
export const reportTabs = [
  { id: "summary", label: "Summary" },
  { id: "by-district", label: "By District" },
  { id: "by-status", label: "By Status" },
];

export { APP_NAME, DEMO_MODE, DEPARTMENTS, DISTRICTS, REQUISITION_STATUSES, STAGING_QUICK_LOGIN, STAGING_DEMO_PASSWORD, STAGING_PRESENTATION_RESET } from "./config";
