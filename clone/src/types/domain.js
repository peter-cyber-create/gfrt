/**
 * Domain types for the Musooka presentation clone / future application.
 * PROPOSED application model until verified against production.
 *
 * Entities: User, Role, Permission, Department, Requisition, RequisitionItem,
 * Approval, StatusHistory, Attachment, Report, Notification, AuditLog,
 * UserRole, RolePermission
 *
 * @typedef {Object} User
 * @property {number|string} id
 * @property {string} name
 * @property {string} email
 * @property {string} role
 * @property {string} [department]
 * @property {string} [status]
 * @property {string} [lastActivity]
 * @property {string} [phone]
 * @property {string[]} [permissions]
 *
 * @typedef {Object} Role
 * @property {number|string} id
 * @property {string} name
 * @property {string} description
 * @property {number} [users]
 * @property {string[]} permissions
 *
 * @typedef {Object} Permission
 * @property {string} id
 * @property {string} label
 * @property {string} [group]
 *
 * @typedef {Object} UserRole
 * @property {string|number} userId
 * @property {string|number} roleId
 *
 * @typedef {Object} RolePermission
 * @property {string|number} roleId
 * @property {string} permissionId
 *
 * @typedef {Object} Department
 * @property {string} id
 * @property {string} name
 *
 * @typedef {'DRAFT'|'SUBMITTED'|'UNDER_REVIEW'|'APPROVED'|'REJECTED'|'PROCESSING'|'COMPLETED'|'CANCELLED'} RequisitionStatusCode
 *
 * @typedef {Object} RequisitionItem
 * @property {string} id
 * @property {string} requisitionId
 * @property {string} description
 * @property {number} quantity
 * @property {string} [unit]
 * @property {number} [unitCost]
 *
 * @typedef {Object} Approval
 * @property {string} id
 * @property {string} requisitionId
 * @property {string} actor
 * @property {string} decision
 * @property {string} at
 * @property {string} [comment]
 *
 * @typedef {Object} StatusHistory
 * @property {string} id
 * @property {string} requisitionId
 * @property {string} fromStatus
 * @property {string} toStatus
 * @property {string} actor
 * @property {string} at
 * @property {string} [note]
 *
 * @typedef {Object} Attachment
 * @property {string} id
 * @property {string} entity
 * @property {string} entityId
 * @property {string} filename
 * @property {string} [mimeType]
 *
 * @typedef {Object} Requisition
 * @property {string} id
 * @property {string} facility
 * @property {string} district
 * @property {string} department
 * @property {string} status
 * @property {RequisitionStatusCode} [statusCode]
 * @property {string} amount
 * @property {number} amountValue
 * @property {string} submitted
 * @property {string} updated
 * @property {string} requester
 * @property {string} description
 * @property {RequisitionItem[]} [items]
 * @property {Approval[]} [approvals]
 * @property {StatusHistory[]} [history]
 *
 * @typedef {Object} Report
 * @property {string} id
 * @property {string} title
 * @property {string} category
 * @property {string} description
 * @property {string} updated
 *
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} text
 * @property {boolean} unread
 * @property {string} time
 *
 * @typedef {Object} AuditLog
 * @property {string} id
 * @property {string} user
 * @property {string} action
 * @property {string} entity
 * @property {string} entityId
 * @property {string} timestamp
 * @property {Object} [metadata]
 */

export {};
