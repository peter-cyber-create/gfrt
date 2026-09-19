/**
 * Deterministic presentation/staging seed — fictional MOH-style operational data.
 * Never run against production. Never touches musooka.site.
 */
import { PrismaClient, type Prisma, type RequisitionStatus } from "@prisma/client";
import * as argon2 from "argon2";

export const PERMISSIONS = [
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

export const ROLE_PERMS: Record<string, string[]> = {
  Administrator: PERMISSIONS.map((p) => p.code),
  Reviewer: [
    "requisition.view",
    "requisition.approve",
    "requisition.reject",
    "report.view",
    "report.export",
    "user.view",
  ],
  Approver: [
    "requisition.view",
    "requisition.approve",
    "requisition.reject",
    "report.view",
  ],
  Finance: [
    "requisition.view",
    "report.view",
    "report.export",
    "audit.view",
  ],
  Procurement: [
    "requisition.view",
    "requisition.create",
    "requisition.edit",
    "requisition.submit",
    "report.view",
  ],
  Requester: [
    "requisition.view",
    "requisition.create",
    "requisition.edit",
    "requisition.submit",
    "report.view",
  ],
  Auditor: [
    "requisition.view",
    "report.view",
    "report.export",
    "audit.view",
    "user.view",
    "role.view",
  ],
};

const DEPARTMENTS = [
  "Finance",
  "Procurement",
  "Human Resources",
  "ICT",
  "Operations",
  "Administration",
  "Programs",
  "Logistics",
  "Monitoring & Evaluation",
  "Supply Chain",
  "Planning",
  "Laboratory",
] as const;

const FACILITIES = [
  "Mulago National Referral Hospital",
  "Jinja Regional Referral Hospital",
  "Mbarara Regional Referral Hospital",
  "Gulu Regional Referral Hospital",
  "Fort Portal Regional Referral Hospital",
  "Mbale Regional Referral Hospital",
  "Soroti Regional Referral Hospital",
  "Lira Regional Referral Hospital",
  "Arua Regional Referral Hospital",
  "Masaka Regional Referral Hospital",
  "Entebbe Regional Referral Hospital",
  "Kawempe National Referral Hospital",
];

const DISTRICTS = [
  "Kampala",
  "Jinja",
  "Mbarara",
  "Gulu",
  "Kabarole",
  "Mbale",
  "Soroti",
  "Lira",
  "Arua",
  "Masaka",
  "Wakiso",
  "Mukono",
];

const PEOPLE: Array<{ name: string; local: string; dept: (typeof DEPARTMENTS)[number]; role: string }> = [
  { name: "Staging Administrator", local: "admin", dept: "Administration", role: "Administrator" },
  { name: "Agnes Nabirye", local: "reviewer", dept: "Programs", role: "Reviewer" },
  { name: "Peter Okello", local: "user", dept: "Laboratory", role: "Requester" },
  { name: "John Kato", local: "john.kato", dept: "Finance", role: "Finance" },
  { name: "Sarah Namusoke", local: "sarah.namusoke", dept: "Procurement", role: "Procurement" },
  { name: "David Mugisha", local: "david.mugisha", dept: "ICT", role: "Requester" },
  { name: "Grace Nakato", local: "grace.nakato", dept: "Human Resources", role: "Requester" },
  { name: "Michael Okello", local: "michael.okello", dept: "Operations", role: "Approver" },
  { name: "Rebecca Atim", local: "rebecca.atim", dept: "Logistics", role: "Requester" },
  { name: "James Ssebunya", local: "james.ssebunya", dept: "Supply Chain", role: "Procurement" },
  { name: "Helen Achieng", local: "helen.achieng", dept: "Monitoring & Evaluation", role: "Auditor" },
  { name: "Brian Tumusiime", local: "brian.tumusiime", dept: "Planning", role: "Requester" },
  { name: "Patricia Nalwoga", local: "patricia.nalwoga", dept: "Finance", role: "Finance" },
  { name: "Samuel Ochieng", local: "samuel.ochieng", dept: "Laboratory", role: "Requester" },
  { name: "Irene Nabukeera", local: "irene.nabukeera", dept: "Programs", role: "Reviewer" },
  { name: "Francis Byaruhanga", local: "francis.byaruhanga", dept: "Administration", role: "Approver" },
  { name: "Carol Akello", local: "carol.akello", dept: "Human Resources", role: "Requester" },
  { name: "Daniel Waiswa", local: "daniel.waiswa", dept: "ICT", role: "Requester" },
  { name: "Joyce Namuli", local: "joyce.namuli", dept: "Operations", role: "Requester" },
  { name: "Robert Kaggwa", local: "robert.kaggwa", dept: "Procurement", role: "Procurement" },
  { name: "Esther Nambi", local: "esther.nambi", dept: "Logistics", role: "Requester" },
  { name: "Patrick Ojok", local: "patrick.ojok", dept: "Supply Chain", role: "Requester" },
  { name: "Mary Namatovu", local: "mary.namatovu", dept: "Finance", role: "Auditor" },
  { name: "Andrew Musoke", local: "andrew.musoke", dept: "Programs", role: "Requester" },
  { name: "Lydia Nabossa", local: "lydia.nabossa", dept: "Monitoring & Evaluation", role: "Requester" },
  { name: "Gerald Opio", local: "gerald.opio", dept: "Planning", role: "Approver" },
  { name: "Christine Amongin", local: "christine.amongin", dept: "Laboratory", role: "Requester" },
  { name: "Hassan Nsubuga", local: "hassan.nsubuga", dept: "Administration", role: "Requester" },
  { name: "Faith Namukasa", local: "faith.namukasa", dept: "Operations", role: "Requester" },
  { name: "Tom Lubega", local: "tom.lubega", dept: "ICT", role: "Requester" },
  { name: "Anita Kyomuhendo", local: "anita.kyomuhendo", dept: "Procurement", role: "Reviewer" },
  { name: "Paul Ssali", local: "paul.ssali", dept: "Finance", role: "Requester" },
  { name: "Betty Acen", local: "betty.acen", dept: "Human Resources", role: "Requester" },
  { name: "Ivan Muwonge", local: "ivan.muwonge", dept: "Logistics", role: "Requester" },
  { name: "Rita Nankya", local: "rita.nankya", dept: "Programs", role: "Requester" },
  { name: "George Okot", local: "george.okot", dept: "Supply Chain", role: "Approver" },
];

const ITEM_CATALOG: Array<{ description: string; unit: string; unitCost: number }> = [
  { description: "Rapid diagnostic test kits (box of 25)", unit: "box", unitCost: 185000 },
  { description: "Antiretroviral therapy starter packs", unit: "pack", unitCost: 420000 },
  { description: "Laboratory reagents — chemistry panel", unit: "kit", unitCost: 965000 },
  { description: "Personal protective equipment (PPE) set", unit: "set", unitCost: 78000 },
  { description: "Cold-chain vaccine carriers", unit: "unit", unitCost: 1250000 },
  { description: "Office stationery and printing supplies", unit: "lot", unitCost: 245000 },
  { description: "Laptop computers for district officers", unit: "unit", unitCost: 3200000 },
  { description: "Network switches (24-port)", unit: "unit", unitCost: 1850000 },
  { description: "Fuel for outreach supervision", unit: "litre", unitCost: 5200 },
  { description: "Medical consumables — gloves (carton)", unit: "carton", unitCost: 310000 },
  { description: "Ambulance maintenance spare parts", unit: "lot", unitCost: 2750000 },
  { description: "Training venue and facilitation materials", unit: "package", unitCost: 1480000 },
  { description: "Pharmaceutical stock — essential medicines", unit: "lot", unitCost: 6850000 },
  { description: "Data collection tablets for M&E", unit: "unit", unitCost: 1450000 },
  { description: "Solar backup batteries for cold rooms", unit: "unit", unitCost: 4100000 },
];

const DESCRIPTIONS = [
  "Quarterly replenishment of essential commodities for facility service delivery.",
  "Emergency restock following increased outpatient catchment demand.",
  "Scheduled ICT refresh for district coordination offices.",
  "Support for integrated outreach and community health campaigns.",
  "Laboratory quality assurance supplies for accreditation readiness.",
  "Administrative support package for regional supervisory visits.",
  "Cold-chain strengthening for immunization program continuity.",
  "HR induction materials and staff welfare support items.",
  "Logistics consolidation for last-mile distribution routes.",
  "Program implementation tools for partner-supported interventions.",
];

/** Deterministic PRNG (mulberry32) — same seed → same presentation dataset. */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function daysAgo(rand: () => number, min: number, max: number) {
  const d = min + Math.floor(rand() * (max - min + 1));
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() - d);
  dt.setUTCHours(8 + Math.floor(rand() * 8), Math.floor(rand() * 60), 0, 0);
  return dt;
}

function addDays(base: Date, days: number) {
  const dt = new Date(base);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt;
}

type TargetStatus = RequisitionStatus;

/** Approximate distribution over actual lifecycle statuses. */
function pickTargetStatus(rand: () => number): TargetStatus {
  const x = rand();
  if (x < 0.04) return "DRAFT";
  if (x < 0.07) return "CANCELLED";
  if (x < 0.22) return "SUBMITTED";
  if (x < 0.32) return "UNDER_REVIEW";
  if (x < 0.47) return "PROCESSING";
  if (x < 0.82) return "APPROVED";
  if (x < 0.9) return "REJECTED";
  return "COMPLETED";
}

function deterministicPath(target: TargetStatus, rand: () => number): RequisitionStatus[] {
  switch (target) {
    case "DRAFT":
      return ["DRAFT"];
    case "CANCELLED":
      return rand() < 0.5 ? ["DRAFT", "CANCELLED"] : ["DRAFT", "SUBMITTED", "CANCELLED"];
    case "SUBMITTED":
      return ["DRAFT", "SUBMITTED"];
    case "UNDER_REVIEW":
      return ["DRAFT", "SUBMITTED", "UNDER_REVIEW"];
    case "PROCESSING":
      return ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "PROCESSING"];
    case "APPROVED":
      return rand() < 0.55
        ? ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED"]
        : ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "PROCESSING", "APPROVED"];
    case "REJECTED":
      return rand() < 0.6
        ? ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "REJECTED"]
        : ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "PROCESSING", "REJECTED"];
    case "COMPLETED":
      return ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "COMPLETED"];
    default:
      return ["DRAFT"];
  }
}

async function clearAll(prisma: PrismaClient) {
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
}

export type PresentationSeedResult = {
  users: number;
  departments: number;
  roles: number;
  requisitions: number;
  notifications: number;
  auditEvents: number;
  approvals: number;
  statusHistory: number;
};

export async function seedPresentation(
  prisma: PrismaClient,
  options: { password?: string; requisitionCount?: number } = {}
): Promise<PresentationSeedResult> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("seedPresentation must not run in production.");
  }
  const password = options.password || process.env.STAGING_SEED_PASSWORD || "demo1234";
  const requisitionCount = options.requisitionCount ?? 180;
  const rand = mulberry32(20260915);

  console.log("Seeding presentation dataset (staging only, fictional data)...");
  await clearAll(prisma);

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
        description: `${name} role — staging presentation RBAC`,
        rolePermissions: {
          create: codes.map((code) => ({ permissionId: permByCode[code] })),
        },
      },
    });
    roles[name] = role.id;
  }

  const departments: Record<string, string> = {};
  for (const name of DEPARTMENTS) {
    const d = await prisma.department.create({ data: { name } });
    departments[name] = d.id;
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const usersByLocal: Record<string, { id: string; name: string; role: string; dept: string }> = {};
  for (const person of PEOPLE) {
    const created = await prisma.user.create({
      data: {
        email: `${person.local}@gfrt.local`,
        name: person.name,
        passwordHash,
        departmentId: departments[person.dept],
        phone: `+25670${String(1000000 + Math.floor(rand() * 8000000)).slice(0, 7)}`,
        lastLoginAt: daysAgo(rand, 0, 40),
        userRoles: { create: { roleId: roles[person.role] } },
      },
    });
    usersByLocal[person.local] = { id: created.id, name: person.name, role: person.role, dept: person.dept };
  }

  const userList = Object.values(usersByLocal);
  const requesters = userList.filter((u) =>
    ["Requester", "Procurement", "Finance", "Administrator"].includes(u.role)
  );
  const reviewers = userList.filter((u) => ["Reviewer", "Approver", "Administrator"].includes(u.role));
  const admin = usersByLocal.admin!;
  const reviewer = usersByLocal.reviewer!;

  let approvals = 0;
  let statusHistory = 0;
  let notifications = 0;
  let auditEvents = 0;
  const auditBatch: Array<{
    actorId: string;
    action: string;
    entity: string;
    entityId: string;
    metadata: Prisma.InputJsonValue;
    createdAt: Date;
  }> = [];

  auditBatch.push({
    actorId: admin.id,
    action: "presentation.seed",
    entity: "system",
    entityId: "staging",
    metadata: { requisitions: requisitionCount, users: PEOPLE.length },
    createdAt: new Date(),
  });

  for (let i = 1; i <= requisitionCount; i++) {
    const target = pickTargetStatus(rand);
    // Use deterministic path helpers (avoid Math.random inside path builders for consistency)
    const path = deterministicPath(target, rand);
    const requester = pick(rand, requesters.length ? requesters : userList);
    const reviewerActor = pick(rand, reviewers.length ? reviewers : [reviewer, admin]);
    const deptName = pick(rand, DEPARTMENTS);
    // Bias: Finance → higher amounts; ICT → tech items; Procurement → volume
    const itemBase = pick(rand, ITEM_CATALOG);
    let qty = 1 + Math.floor(rand() * 12);
    let unitCost = itemBase.unitCost;
    if (deptName === "Finance") unitCost = Math.round(unitCost * (1.4 + rand()));
    if (deptName === "ICT") {
      qty = 1 + Math.floor(rand() * 4);
      unitCost = Math.round(unitCost * (1.1 + rand() * 0.8));
    }
    if (deptName === "Procurement") qty = 3 + Math.floor(rand() * 20);
    const amountValue = qty * unitCost + Math.floor(rand() * 17000) - 8500;
    const createdAt = daysAgo(rand, 15, 150);
    const number = `REQ-2026-${String(i).padStart(5, "0")}`;

    let submittedAt: Date | null = null;
    let cursor = createdAt;
    const historyData: Array<{
      fromStatus: RequisitionStatus | null;
      toStatus: RequisitionStatus;
      actorId: string;
      note: string | null;
      createdAt: Date;
    }> = [];
    const approvalData: Array<{
      actorId: string;
      decision: string;
      comment: string;
      createdAt: Date;
    }> = [];

    for (let s = 0; s < path.length; s++) {
      const toStatus = path[s]!;
      const fromStatus = s === 0 ? null : path[s - 1]!;
      cursor = addDays(cursor, s === 0 ? 0 : 1 + Math.floor(rand() * 5));
      let actorId = requester.id;
      let note: string | null = null;
      if (toStatus === "SUBMITTED") {
        submittedAt = cursor;
        actorId = requester.id;
        note = "Submitted for departmental review.";
      } else if (toStatus === "UNDER_REVIEW") {
        actorId = reviewerActor.id;
        note = "Taken up for technical and compliance review.";
      } else if (toStatus === "PROCESSING") {
        actorId = reviewerActor.id;
        note = "Moved to processing pending final authorization.";
      } else if (toStatus === "APPROVED") {
        actorId = reviewerActor.id;
        note = "Approved for fulfilment within available budget.";
        approvalData.push({
          actorId,
          decision: "APPROVED",
          comment: note,
          createdAt: cursor,
        });
      } else if (toStatus === "REJECTED") {
        actorId = reviewerActor.id;
        note = "Rejected — incomplete supporting documentation.";
        approvalData.push({
          actorId,
          decision: "REJECTED",
          comment: note,
          createdAt: cursor,
        });
      } else if (toStatus === "COMPLETED") {
        actorId = pick(rand, [admin, reviewerActor]).id;
        note = "Delivery confirmed and requisition closed.";
      } else if (toStatus === "CANCELLED") {
        actorId = requester.id;
        note = "Cancelled by requester — no longer required.";
      } else if (toStatus === "DRAFT") {
        actorId = requester.id;
        note = "Draft captured in system.";
      }
      historyData.push({ fromStatus, toStatus, actorId, note, createdAt: cursor });
    }

    const finalStatus = path[path.length - 1]!;
    const req = await prisma.requisition.create({
      data: {
        number,
        facility: pick(rand, FACILITIES),
        district: pick(rand, DISTRICTS),
        departmentId: departments[deptName],
        status: finalStatus,
        amountValue: Math.max(45000, amountValue),
        description: `${pick(rand, DESCRIPTIONS)} (${deptName})`,
        requesterId: requester.id,
        submittedAt,
        requiredAt: submittedAt ? addDays(submittedAt, 14 + Math.floor(rand() * 30)) : addDays(createdAt, 21),
        createdAt,
        updatedAt: cursor,
        items: {
          create: [
            {
              description: itemBase.description,
              quantity: qty,
              unit: itemBase.unit,
              unitCost,
            },
            ...(rand() > 0.55
              ? [
                  {
                    description: pick(rand, ITEM_CATALOG).description,
                    quantity: 1 + Math.floor(rand() * 5),
                    unit: "unit",
                    unitCost: 50000 + Math.floor(rand() * 400000),
                  },
                ]
              : []),
          ],
        },
        history: { create: historyData },
        approvals: { create: approvalData },
      },
    });

    statusHistory += historyData.length;
    approvals += approvalData.length;

    // Notifications tied to real users/requisitions
    if (finalStatus === "UNDER_REVIEW" || finalStatus === "SUBMITTED") {
      await prisma.notification.create({
        data: {
          userId: reviewerActor.id,
          text: `Requisition ${number} requires your review.`,
          unread: rand() > 0.35,
          createdAt: cursor,
        },
      });
      notifications += 1;
    }
    if (finalStatus === "APPROVED") {
      await prisma.notification.create({
        data: {
          userId: requester.id,
          text: `Requisition ${number} has been approved.`,
          unread: rand() > 0.4,
          createdAt: cursor,
        },
      });
      notifications += 1;
    }
    if (finalStatus === "REJECTED") {
      await prisma.notification.create({
        data: {
          userId: requester.id,
          text: `Requisition ${number} was rejected.`,
          unread: rand() > 0.3,
          createdAt: cursor,
        },
      });
      notifications += 1;
    }
    if (finalStatus === "PROCESSING") {
      await prisma.notification.create({
        data: {
          userId: requester.id,
          text: `Your requisition ${number} has moved to processing.`,
          unread: rand() > 0.5,
          createdAt: cursor,
        },
      });
      notifications += 1;
    }

    // Audit trail — skip most DRAFT creates; keep terminal / review events
    for (const h of historyData) {
      if (h.toStatus === "DRAFT" && rand() > 0.15) continue;
      auditBatch.push({
        actorId: h.actorId,
        action: `requisition.${String(h.toStatus).toLowerCase()}`,
        entity: "requisition",
        entityId: req.id,
        metadata: { number, from: h.fromStatus, to: h.toStatus },
        createdAt: h.createdAt,
      });
    }
  }

  // Extra notifications / audit for realism
  const notifExtra = [];
  for (let i = 0; i < 25; i++) {
    const u = pick(rand, userList);
    notifExtra.push({
      userId: u.id,
      text: pick(rand, [
        "Weekly requisition summary is available in Reports.",
        "Please complete pending reviews before Friday close of business.",
        "System maintenance window scheduled for Sunday 02:00–04:00.",
        "New departmental performance figures are ready on Analytics.",
      ]),
      unread: rand() > 0.5,
      createdAt: daysAgo(rand, 0, 20),
    });
  }
  if (notifExtra.length) {
    await prisma.notification.createMany({ data: notifExtra });
    notifications += notifExtra.length;
  }

  for (const u of userList.slice(0, 20)) {
    auditBatch.push({
      actorId: u.id,
      action: "login",
      entity: "session",
      entityId: u.id,
      metadata: { source: "presentation-seed" },
      createdAt: daysAgo(rand, 0, 30),
    });
  }

  // Flush audits in chunks
  const chunk = 200;
  for (let i = 0; i < auditBatch.length; i += chunk) {
    await prisma.auditLog.createMany({
      data: auditBatch.slice(i, i + chunk).map((a) => ({
        actorId: a.actorId,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        metadata: a.metadata,
        createdAt: a.createdAt,
      })),
    });
  }
  auditEvents = auditBatch.length;

  const result: PresentationSeedResult = {
    users: PEOPLE.length,
    departments: DEPARTMENTS.length,
    roles: Object.keys(ROLE_PERMS).length,
    requisitions: requisitionCount,
    notifications,
    auditEvents,
    approvals,
    statusHistory,
  };

  await verifyPresentationConsistency(prisma, result);

  console.log(
    `Presentation seed complete: users=${result.users} depts=${result.departments} reqs=${result.requisitions} notifs=${result.notifications} audit=${result.auditEvents}`
  );
  console.log("Demo logins (password from STAGING_SEED_PASSWORD):");
  console.log("  admin@gfrt.local");
  console.log("  reviewer@gfrt.local");
  console.log("  user@gfrt.local");

  return result;
}

export async function verifyPresentationConsistency(
  prisma: PrismaClient,
  expected?: Partial<PresentationSeedResult>
) {
  const [users, departments, roles, requisitions, notifications, auditEvents, approvals, statusHistory] =
    await Promise.all([
      prisma.user.count(),
      prisma.department.count(),
      prisma.role.count(),
      prisma.requisition.count(),
      prisma.notification.count(),
      prisma.auditLog.count(),
      prisma.approval.count(),
      prisma.statusHistory.count(),
    ]);

  const failures: string[] = [];
  if (users < 25) failures.push(`users=${users} (<25)`);
  if (departments < 8) failures.push(`departments=${departments} (<8)`);
  if (roles < 3) failures.push(`roles=${roles} (<3)`);
  if (requisitions < 100) failures.push(`requisitions=${requisitions} (<100)`);
  if (notifications < 50) failures.push(`notifications=${notifications} (<50)`);
  if (auditEvents < 100) failures.push(`auditEvents=${auditEvents} (<100)`);
  if (statusHistory < requisitions) failures.push(`statusHistory=${statusHistory} (<reqs)`);

  const demoEmails = [
    "admin@gfrt.local",
    "reviewer@gfrt.local",
    "user@gfrt.local",
  ];
  for (const email of demoEmails) {
    const u = await prisma.user.findUnique({ where: { email }, include: { userRoles: { include: { role: true } } } });
    if (!u) failures.push(`missing demo user ${email}`);
  }

  const historyWithoutReq = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
    `SELECT COUNT(*)::bigint AS c FROM status_history sh LEFT JOIN requisitions r ON r.id = sh.requisition_id WHERE r.id IS NULL`
  );
  if (Number(historyWithoutReq[0]?.c || 0) > 0) failures.push("orphaned status_history");

  const notifWithoutUser = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
    `SELECT COUNT(*)::bigint AS c FROM notifications n LEFT JOIN users u ON u.id = n.user_id WHERE u.id IS NULL`
  );
  if (Number(notifWithoutUser[0]?.c || 0) > 0) failures.push("orphaned notifications");

  const auditWithoutActor = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
    `SELECT COUNT(*)::bigint AS c FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id WHERE a.actor_id IS NOT NULL AND u.id IS NULL`
  );
  if (Number(auditWithoutActor[0]?.c || 0) > 0) failures.push("orphaned audit_logs");

  if (expected?.requisitions != null && expected.requisitions !== requisitions) {
    failures.push(`expected requisitions=${expected.requisitions} got ${requisitions}`);
  }

  if (failures.length) {
    throw new Error(`Presentation seed consistency failed: ${failures.join("; ")}`);
  }

  return {
    users,
    departments,
    roles,
    requisitions,
    notifications,
    auditEvents,
    approvals,
    statusHistory,
  };
}
