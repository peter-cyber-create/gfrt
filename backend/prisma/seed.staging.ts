import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { code: "requisition.view", label: "View requisitions", groupName: "requisition" },
  { code: "requisition.create", label: "Create requisitions", groupName: "requisition" },
  { code: "requisition.edit", label: "Edit requisitions", groupName: "requisition" },
  { code: "requisition.submit", label: "Submit requisitions", groupName: "requisition" },
  { code: "requisition.approve", label: "Approve requisitions", groupName: "requisition" },
  { code: "requisition.reject", label: "Reject requisitions", groupName: "requisition" },
  { code: "report.view", label: "View reports", groupName: "report" },
  { code: "report.export", label: "Export reports", groupName: "report" },
  { code: "user.view", label: "View users", groupName: "user" },
  { code: "user.manage", label: "Manage users", groupName: "user" },
  { code: "role.view", label: "View roles", groupName: "role" },
  { code: "role.manage", label: "Manage roles", groupName: "role" },
  { code: "settings.view", label: "View settings", groupName: "settings" },
  { code: "audit.view", label: "View audit log", groupName: "audit" },
] as const;

const ROLE_PERMS: Record<string, string[]> = {
  Administrator: PERMISSIONS.map((p) => p.code),
  Reviewer: [
    "requisition.view",
    "requisition.approve",
    "requisition.reject",
    "report.view",
    "report.export",
    "user.view",
  ],
  Requester: [
    "requisition.view",
    "requisition.create",
    "requisition.edit",
    "requisition.submit",
    "report.view",
  ],
};

const STAGING_PASSWORD =
  process.env.STAGING_SEED_PASSWORD || "StagingOnly!Pass123";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("seed.staging.ts must not run in production.");
  }

  console.log("Seeding staging database (staging.musooka.local accounts only)...");

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

  for (const p of PERMISSIONS) {
    await prisma.permission.create({ data: p });
  }
  const perms = await prisma.permission.findMany();
  const permByCode = Object.fromEntries(perms.map((p) => [p.code, p.id]));

  const roles: Record<string, string> = {};
  for (const [name, codes] of Object.entries(ROLE_PERMS)) {
    const role = await prisma.role.create({
      data: {
        name,
        description: `${name} role (staging RBAC)`,
        rolePermissions: {
          create: codes.map((code) => ({ permissionId: permByCode[code] })),
        },
      },
    });
    roles[name] = role.id;
  }

  const deptNames = ["Laboratory", "Pharmacy", "Logistics", "Finance"];
  const departments: Record<string, string> = {};
  for (const name of deptNames) {
    const d = await prisma.department.create({ data: { name } });
    departments[name] = d.id;
  }

  const passwordHash = await argon2.hash(STAGING_PASSWORD, { type: argon2.argon2id });

  const admin = await prisma.user.create({
    data: {
      email: "admin@staging.musooka.local",
      name: "Staging Administrator",
      passwordHash,
      departmentId: departments.Finance,
      userRoles: { create: { roleId: roles.Administrator } },
    },
  });

  const reviewer = await prisma.user.create({
    data: {
      email: "reviewer@staging.musooka.local",
      name: "Staging Reviewer",
      passwordHash,
      departmentId: departments.Logistics,
      userRoles: { create: { roleId: roles.Reviewer } },
    },
  });

  const requester = await prisma.user.create({
    data: {
      email: "user@staging.musooka.local",
      name: "Staging Requester",
      passwordHash,
      departmentId: departments.Laboratory,
      userRoles: { create: { roleId: roles.Requester } },
    },
  });

  const draft = await prisma.requisition.create({
    data: {
      number: "REQ-STG-0001",
      facility: "Staging Central Lab",
      district: "Kampala",
      departmentId: departments.Laboratory,
      description: "Staging draft requisition",
      amountValue: 2_500_000,
      requesterId: requester.id,
      status: "DRAFT",
      items: {
        create: [
          { description: "Rapid test kits", quantity: 25, unit: "box", unitCost: 60000 },
        ],
      },
      history: {
        create: {
          fromStatus: null,
          toStatus: "DRAFT",
          actorId: requester.id,
          note: "Staging seed draft",
        },
      },
    },
  });

  const underReview = await prisma.requisition.create({
    data: {
      number: "REQ-STG-0002",
      facility: "Staging Regional Hospital",
      district: "Jinja",
      departmentId: departments.Pharmacy,
      description: "Staging medicines restock",
      amountValue: 8_500_000,
      requesterId: requester.id,
      status: "UNDER_REVIEW",
      submittedAt: new Date(),
      items: {
        create: [
          { description: "Paracetamol 500mg", quantity: 150, unit: "pack", unitCost: 12000 },
        ],
      },
      history: {
        create: [
          { fromStatus: null, toStatus: "DRAFT", actorId: requester.id, note: "Created" },
          { fromStatus: "DRAFT", toStatus: "SUBMITTED", actorId: requester.id, note: "Submitted" },
          {
            fromStatus: "SUBMITTED",
            toStatus: "UNDER_REVIEW",
            actorId: reviewer.id,
            note: "In review",
          },
        ],
      },
    },
  });

  await prisma.notification.createMany({
    data: [
      { userId: requester.id, text: "Welcome to Musooka staging." },
      { userId: reviewer.id, text: `Requisition ${underReview.number} awaits review.` },
      { userId: admin.id, text: "Staging seed completed." },
    ],
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "system.seed",
      entity: "database",
      entityId: "seed.staging",
      metadata: {
        users: [admin.email, reviewer.email, requester.email],
        requisitions: [draft.number, underReview.number],
        environment: "staging",
      },
    },
  });

  console.log("Staging seed complete.");
  console.log("  admin@staging.musooka.local");
  console.log("  reviewer@staging.musooka.local");
  console.log("  user@staging.musooka.local");
  console.log("  (password from STAGING_SEED_PASSWORD env)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
