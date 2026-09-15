import { beforeAll, afterAll, beforeEach } from "vitest";
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");

export const prisma = new PrismaClient();

export const SEED_PASSWORD = "DevOnly!Pass123";

export let ids: {
  adminId: string;
  reviewerId: string;
  requesterId: string;
  departmentId: string;
  draftReqId: string;
  reviewReqId: string;
  adminRoleId: string;
  requesterRoleId: string;
};

beforeAll(async () => {
  execSync("npx prisma migrate deploy", {
    cwd: backendRoot,
    env: { ...process.env },
    stdio: "inherit",
  });
});

beforeEach(async () => {
  await prisma.passwordResetToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.statusHistory.deleteMany();
  await prisma.requisitionItem.deleteMany();
  await prisma.requisition.deleteMany();
  await prisma.session.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.department.deleteMany();

  const perms = [
    "requisition.view",
    "requisition.create",
    "requisition.edit",
    "requisition.submit",
    "requisition.approve",
    "requisition.reject",
    "report.view",
    "report.export",
    "user.view",
    "user.manage",
    "role.view",
    "role.manage",
    "settings.view",
    "audit.view",
  ];
  for (const code of perms) {
    await prisma.permission.create({
      data: { code, label: code, groupName: code.split(".")[0] },
    });
  }
  const all = await prisma.permission.findMany();
  const byCode = Object.fromEntries(all.map((p) => [p.code, p.id]));

  const adminRole = await prisma.role.create({
    data: {
      name: "Administrator",
      rolePermissions: { create: all.map((p) => ({ permissionId: p.id })) },
    },
  });
  const reviewerRole = await prisma.role.create({
    data: {
      name: "Reviewer",
      rolePermissions: {
        create: [
          "requisition.view",
          "requisition.approve",
          "requisition.reject",
          "report.view",
          "user.view",
        ].map((c) => ({ permissionId: byCode[c] })),
      },
    },
  });
  const requesterRole = await prisma.role.create({
    data: {
      name: "Requester",
      rolePermissions: {
        create: [
          "requisition.view",
          "requisition.create",
          "requisition.edit",
          "requisition.submit",
          "report.view",
        ].map((c) => ({ permissionId: byCode[c] })),
      },
    },
  });

  const dept = await prisma.department.create({ data: { name: "Laboratory" } });
  const hash = await argon2.hash(SEED_PASSWORD, { type: argon2.argon2id });

  const admin = await prisma.user.create({
    data: {
      email: "admin@musooka.local",
      name: "Admin",
      passwordHash: hash,
      departmentId: dept.id,
      userRoles: { create: { roleId: adminRole.id } },
    },
  });
  const reviewer = await prisma.user.create({
    data: {
      email: "reviewer@musooka.local",
      name: "Reviewer",
      passwordHash: hash,
      departmentId: dept.id,
      userRoles: { create: { roleId: reviewerRole.id } },
    },
  });
  const requester = await prisma.user.create({
    data: {
      email: "user@musooka.local",
      name: "Requester",
      passwordHash: hash,
      departmentId: dept.id,
      userRoles: { create: { roleId: requesterRole.id } },
    },
  });
  const inactive = await prisma.user.create({
    data: {
      email: "inactive@musooka.local",
      name: "Inactive",
      passwordHash: hash,
      status: "INACTIVE",
      userRoles: { create: { roleId: requesterRole.id } },
    },
  });
  void inactive;

  const draft = await prisma.requisition.create({
    data: {
      number: "REQ-TEST-0001",
      facility: "Test Facility",
      district: "Kampala",
      departmentId: dept.id,
      description: "Draft requisition",
      amountValue: 1000,
      requesterId: requester.id,
      status: "DRAFT",
      items: { create: [{ description: "Item A", quantity: 1 }] },
      history: { create: { toStatus: "DRAFT", actorId: requester.id } },
    },
  });

  const underReview = await prisma.requisition.create({
    data: {
      number: "REQ-TEST-0002",
      facility: "Test Facility 2",
      district: "Jinja",
      departmentId: dept.id,
      description: "Under review",
      amountValue: 2000,
      requesterId: requester.id,
      status: "UNDER_REVIEW",
      submittedAt: new Date(),
      items: { create: [{ description: "Item B", quantity: 2 }] },
      history: {
        create: [
          { toStatus: "DRAFT", actorId: requester.id },
          { fromStatus: "DRAFT", toStatus: "SUBMITTED", actorId: requester.id },
          { fromStatus: "SUBMITTED", toStatus: "UNDER_REVIEW", actorId: reviewer.id },
        ],
      },
    },
  });

  ids = {
    adminId: admin.id,
    reviewerId: reviewer.id,
    requesterId: requester.id,
    departmentId: dept.id,
    draftReqId: draft.id,
    reviewReqId: underReview.id,
    adminRoleId: adminRole.id,
    requesterRoleId: requesterRole.id,
  };
});

afterAll(async () => {
  await prisma.$disconnect();
});
