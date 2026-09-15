/**
 * Service facade — UI should import from here, not from mock data arrays.
 * Demo mode always resolves to mock implementations.
 */
import { DATA_SOURCE, DEMO_MODE } from "../data/config.js";
import { mockAuthService } from "./mock/authService.js";
import { mockRequisitionService } from "./mock/requisitionService.js";
import { mockUserService } from "./mock/userService.js";
import { mockRoleService } from "./mock/roleService.js";
import { mockReportService } from "./mock/reportService.js";
import { mockNotificationService, mockAuditService } from "./mock/notificationService.js";
import {
  apiAuthService,
  apiRequisitionService,
  apiUserService,
  apiRoleService,
  apiReportService,
  apiNotificationService,
  apiAuditService,
} from "./api/client.js";

const useApi = !DEMO_MODE && DATA_SOURCE === "api";

export const authService = useApi ? apiAuthService : mockAuthService;
export const requisitionService = useApi ? apiRequisitionService : mockRequisitionService;
export const userService = useApi ? apiUserService : mockUserService;
export const roleService = useApi ? apiRoleService : mockRoleService;
export const reportService = useApi ? apiReportService : mockReportService;
export const notificationService = useApi ? apiNotificationService : mockNotificationService;
export const auditService = useApi ? apiAuditService : mockAuditService;

export function getDataSource() {
  return useApi ? "api" : "mock";
}

export async function resetDemoData(actor) {
  return reportService.resetDemo(actor);
}
