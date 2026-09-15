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

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to seed: NODE_ENV=production. Production must use migrate deploy only — never development seed accounts.",
    );
  }
  console.log("Seeding development database (non-production demo accounts only)...");

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
        description: `${name} role (proposed RBAC)`,
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

  const passwordHash = await argon2.hash("DevOnly!Pass123", { type: argon2.argon2id });

  const admin = await prisma.user.create({
    data: {
      email: "admin@musooka.local",
      name: "Demo Administrator",
      passwordHash,
      departmentId: departments.Finance,
      userRoles: { create: { roleId: roles.Administrator } },
    },
  });

  const reviewer = await prisma.user.create({
    data: {
      email: "reviewer@musooka.local",
      name: "Demo Reviewer",
      passwordHash,
      departmentId: departments.Logistics,
      userRoles: { create: { roleId: roles.Reviewer } },
    },
  });

  const requester = await prisma.user.create({
    data: {
      email: "user@musooka.local",
      name: "Demo Requester",
      passwordHash,
      departmentId: departments.Laboratory,
      userRoles: { create: { roleId: roles.Requester } },
    },
  });

  const draft = await prisma.requisition.create({
    data: {
      number: "REQ-2026-0001",
      facility: "Kampala Central Lab",
      district: "Kampala",
      departmentId: departments.Laboratory,
      description: "Reagent kit replenishment",
      amountValue: 4_500_000,
      requesterId: requester.id,
      status: "DRAFT",
      items: {
        create: [
          { description: "HIV test kits", quantity: 50, unit: "box", unitCost: 80000 },
          { description: "Gloves (large)", quantity: 20, unit: "box", unitCost: 25000 },
        ],
      },
      history: {
        create: { fromStatus: null, toStatus: "DRAFT", actorId: requester.id, note: "Seeded draft" },
      },
    },
  });

  const submitted = await prisma.requisition.create({
    data: {
      number: "REQ-2026-0002",
      facility: "Jinja Regional Hospital",
      district: "Jinja",
      departmentId: departments.Pharmacy,
      description: "Essential medicines restock",
      amountValue: 12_000_000,
      requesterId: requester.id,
      status: "UNDER_REVIEW",
      submittedAt: new Date(),
      items: {
        create: [{ description: "Amoxicillin 500mg", quantity: 200, unit: "pack", unitCost: 15000 }],
      },
      history: {
        create: [
          { fromStatus: null, toStatus: "DRAFT", actorId: requester.id, note: "Created" },
          { fromStatus: "DRAFT", toStatus: "SUBMITTED", actorId: requester.id, note: "Submitted" },
          { fromStatus: "SUBMITTED", toStatus: "UNDER_REVIEW", actorId: reviewer.id, note: "In review" },
        ],
      },
    },
  });

  await prisma.notification.createMany({
    data: [
      { userId: requester.id, text: "Welcome to Musooka development seed data." },
      { userId: reviewer.id, text: `Requisition ${submitted.number} awaits review.` },
      { userId: admin.id, text: "System seeded successfully." },
    ],
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "system.seed",
      entity: "database",
      entityId: "seed",
      metadata: {
        users: [admin.email, reviewer.email, requester.email],
        requisitions: [draft.number, submitted.number],
        note: "Never use production credentials here",
      },
    },
  });

  console.log("Seed complete.");
  console.log("Demo accounts (NOT production):");
  console.log("  admin@musooka.local / DevOnly!Pass123");
  console.log("  reviewer@musooka.local / DevOnly!Pass123");
  console.log("  user@musooka.local / DevOnly!Pass123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
