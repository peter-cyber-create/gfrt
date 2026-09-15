import { describe, expect, it, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { SEED_PASSWORD, ids, prisma } from "./helpers.js";

const app = createApp();

async function loginAs(email: string) {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: SEED_PASSWORD });
  expect(res.status).toBe(200);
  const cookie = res.headers["set-cookie"];
  return Array.isArray(cookie) ? cookie : [cookie];
}

describe("transaction rollback", () => {
  beforeEach(() => {
    process.env.FORCE_TX_FAILURE = "approve_after_status";
  });

  afterEach(() => {
    delete process.env.FORCE_TX_FAILURE;
  });

  it("rolls back approve side-effects when forced failure occurs", async () => {
    const beforeHistory = await prisma.statusHistory.count({
      where: { requisitionId: ids.reviewReqId },
    });
    const beforeAudit = await prisma.auditLog.count({
      where: { action: "requisition.approve", entityId: ids.reviewReqId },
    });
    const beforeNotifications = await prisma.notification.count();
    const beforeApprovals = await prisma.approval.count({
      where: { requisitionId: ids.reviewReqId },
    });

    const req = await prisma.requisition.findUnique({ where: { id: ids.reviewReqId } });
    expect(req?.status).toBe("UNDER_REVIEW");

    const cookies = await loginAs("reviewer@musooka.local");
    const res = await request(app)
      .post(`/api/v1/requisitions/${ids.reviewReqId}/approve`)
      .set("Cookie", cookies)
      .send({ note: "should rollback" });

    expect(res.status).toBe(500);

    const after = await prisma.requisition.findUnique({ where: { id: ids.reviewReqId } });
    expect(after?.status).toBe("UNDER_REVIEW");

    expect(
      await prisma.statusHistory.count({ where: { requisitionId: ids.reviewReqId } })
    ).toBe(beforeHistory);
    expect(
      await prisma.auditLog.count({
        where: { action: "requisition.approve", entityId: ids.reviewReqId },
      })
    ).toBe(beforeAudit);
    expect(await prisma.notification.count()).toBe(beforeNotifications);
    expect(
      await prisma.approval.count({ where: { requisitionId: ids.reviewReqId } })
    ).toBe(beforeApprovals);
  });
});
