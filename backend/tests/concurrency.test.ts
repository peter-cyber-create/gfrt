import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { SEED_PASSWORD, ids, prisma } from "./helpers.js";

const app = createApp();

async function login(email: string) {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: SEED_PASSWORD });
  expect(res.status).toBe(200);
  const cookie = res.headers["set-cookie"];
  return Array.isArray(cookie) ? cookie : [cookie];
}

describe("concurrency", () => {
  it("serializes dual approve attempts without contradictory status", async () => {
    const reviewerCookies = await login("reviewer@musooka.local");
    const adminCookies = await login("admin@musooka.local");

    const [a, b] = await Promise.all([
      request(app)
        .post(`/api/v1/requisitions/${ids.reviewReqId}/approve`)
        .set("Cookie", reviewerCookies)
        .send({ note: "A" }),
      request(app)
        .post(`/api/v1/requisitions/${ids.reviewReqId}/approve`)
        .set("Cookie", adminCookies)
        .send({ note: "B" }),
    ]);

    const statuses = [a.status, b.status].sort((x, y) => x - y);
    expect(statuses[0]).toBe(200);
    expect([409, 422]).toContain(statuses[1]);

    const row = await prisma.requisition.findUnique({ where: { id: ids.reviewReqId } });
    expect(row?.status).toBe("APPROVED");

    const approvals = await prisma.approval.findMany({ where: { requisitionId: ids.reviewReqId } });
    expect(approvals.length).toBe(1);
  });
});
