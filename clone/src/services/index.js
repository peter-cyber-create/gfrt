/**
 * Service facade — UI imports from here only.
 *
 * Build-time branching uses `import.meta.env.VITE_*` so Vite can dead-code
 * eliminate the mock graph (including presentation passwords) from API builds.
 */
import {
  apiAuthService,
  apiRequisitionService,
  apiUserService,
  apiRoleService,
  apiReportService,
  apiNotificationService,
  apiAuditService,
  apiDepartmentService,
} from "./api/client.js";

const isDemo = import.meta.env.VITE_DEMO_MODE !== "false";
const useApi = !isDemo && (import.meta.env.VITE_DATA_SOURCE || "api") === "api";

/** @type {typeof apiAuthService} */
export let authService;
/** @type {typeof apiRequisitionService} */
export let requisitionService;
/** @type {typeof apiUserService} */
export let userService;
/** @type {typeof apiRoleService} */
export let roleService;
/** @type {typeof apiReportService} */
export let reportService;
/** @type {typeof apiNotificationService} */
export let notificationService;
/** @type {typeof apiAuditService} */
export let auditService;
/** @type {typeof apiDepartmentService} */
export let departmentService;

if (useApi) {
  authService = apiAuthService;
  requisitionService = apiRequisitionService;
  userService = apiUserService;
  roleService = apiRoleService;
  reportService = apiReportService;
  notificationService = apiNotificationService;
  auditService = apiAuditService;
  departmentService = apiDepartmentService;
} else {
  const [
    { mockAuthService },
    { mockRequisitionService },
    { mockUserService },
    { mockRoleService },
    { mockReportService },
    { mockNotificationService, mockAuditService },
  ] = await Promise.all([
    import("./mock/authService.js"),
    import("./mock/requisitionService.js"),
    import("./mock/userService.js"),
    import("./mock/roleService.js"),
    import("./mock/reportService.js"),
    import("./mock/notificationService.js"),
  ]);
  authService = mockAuthService;
  requisitionService = mockRequisitionService;
  userService = mockUserService;
  roleService = mockRoleService;
  reportService = mockReportService;
  notificationService = mockNotificationService;
  auditService = mockAuditService;
  departmentService = {
    async list() {
      const { DEPARTMENTS } = await import("../data/config.js");
      return DEPARTMENTS.map((name, i) => ({ id: `mock-dept-${i}`, name }));
    },
  };
}

export function getDataSource() {
  return useApi ? "api" : "mock";
}

export async function resetDemoData(actor) {
  return reportService.resetDemo(actor);
}
