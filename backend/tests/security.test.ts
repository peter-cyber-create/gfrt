import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { SEED_PASSWORD, ids, prisma } from "./helpers.js";
import { COOKIE_NAME } from "../src/services/authService.js";
import { hashToken } from "../src/services/authService.js";

const app = createApp();

async function loginAs(email: string) {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: SEED_PASSWORD });
  expect(res.status).toBe(200);
  const cookie = res.headers["set-cookie"];
  return Array.isArray(cookie) ? cookie : [cookie];
}

describe("security — authentication", () => {
  it("returns 401 for unauthenticated protected routes", async () => {
    const res = await request(app).get("/api/v1/requisitions");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects expired session cookie", async () => {
    const token = "expired-test-token-0123456789abcdef";
    await prisma.session.create({
      data: {
        userId: ids.adminId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", [`${COOKIE_NAME}=${token}`]);
    expect(res.status).toBe(401);
  });

  it("rejects malformed session cookie", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", [`${COOKIE_NAME}=not-a-valid-session`]);
    expect(res.status).toBe(401);
  });
});

describe("security — CSRF", () => {
  it("returns 403 for POST with disallowed Origin", async () => {
    const cookies = await loginAs("admin@musooka.local");
    const res = await request(app)
      .post("/api/v1/requisitions")
      .set("Cookie", cookies)
      .set("Origin", "https://evil.example")
      .send({
        facility: "X",
        district: "Y",
        departmentId: ids.departmentId,
        description: "test",
        amountValue: 100,
        items: [{ description: "item", quantity: 1 }],
      });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("security — payload limits", () => {
  it("rejects oversized JSON body (>256kb)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ email: "admin@musooka.local", password: "x".repeat(270_000) }));
    expect(res.status).toBe(413);
  });
});

describe("security — validation", () => {
  it("rejects invalid UUID params", async () => {
    const cookies = await loginAs("admin@musooka.local");
    const res = await request(app)
      .get("/api/v1/requisitions/not-a-uuid")
      .set("Cookie", cookies);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("does not 500 on SQL injection-style query strings", async () => {
    const cookies = await loginAs("admin@musooka.local");
    const res = await request(app)
      .get("/api/v1/requisitions?query=" + encodeURIComponent("' OR 1=1--"))
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it("accepts XSS payload in description as stored text", async () => {
    const cookies = await loginAs("user@musooka.local");
    const xss = '<script>alert("xss")</script>';
    const res = await request(app)
      .post("/api/v1/requisitions")
      .set("Cookie", cookies)
      .send({
        facility: "Facility",
        district: "District",
        departmentId: ids.departmentId,
        description: xss,
        amountValue: 100,
        items: [{ description: "item", quantity: 1 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.description).toBe(xss);
  });

  it("ignores mass-assignment of requesterId in body", async () => {
    const cookies = await loginAs("user@musooka.local");
    const res = await request(app)
      .post("/api/v1/requisitions")
      .set("Cookie", cookies)
      .send({
        facility: "Facility",
        district: "District",
        departmentId: ids.departmentId,
        description: "test",
        amountValue: 100,
        requesterId: ids.adminId,
        items: [{ description: "item", quantity: 1 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.requesterId).toBe(ids.requesterId);
  });
});

describe("security — rate limiting", () => {
  let rateApp: ReturnType<typeof createApp>;

  beforeAll(async () => {
    process.env.AUTH_RATE_LIMIT_MAX = "3";
    vi.resetModules();
    const mod = await import("../src/app.js");
    rateApp = mod.createApp();
  });

  afterAll(() => {
    delete process.env.AUTH_RATE_LIMIT_MAX;
  });

  it("returns 429 after exceeding auth rate limit", async () => {
    for (let i = 0; i < 3; i++) {
      await request(rateApp)
        .post("/api/v1/auth/login")
        .send({ email: "admin@musooka.local", password: "wrong" });
    }
    const res = await request(rateApp)
      .post("/api/v1/auth/login")
      .send({ email: "admin@musooka.local", password: "wrong" });
    expect(res.status).toBe(429);
  });
});

describe("security — audit immutability", () => {
  it("cannot create audit log via POST", async () => {
    const cookies = await loginAs("admin@musooka.local");
    const res = await request(app)
      .post("/api/v1/audit-logs")
      .set("Cookie", cookies)
      .send({ action: "forged", entity: "user", entityId: ids.adminId, actorId: ids.adminId });
    expect(res.status).toBe(404);
  });

  it("cannot delete audit log", async () => {
    const cookies = await loginAs("admin@musooka.local");
    const logs = await request(app).get("/api/v1/audit-logs").set("Cookie", cookies);
    const id = logs.body.data[0]?.id || "00000000-0000-0000-0000-000000000001";
    const res = await request(app).delete(`/api/v1/audit-logs/${id}`).set("Cookie", cookies);
    expect(res.status).toBe(404);
  });
});

describe("security — authorization", () => {
  it("requester cannot approve requisitions", async () => {
    const cookies = await loginAs("user@musooka.local");
    const res = await request(app)
      .post(`/api/v1/requisitions/${ids.reviewReqId}/approve`)
      .set("Cookie", cookies)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("prevents IDOR on notifications", async () => {
    const note = await prisma.notification.create({
      data: { userId: ids.adminId, text: "admin only" },
    });
    const cookies = await loginAs("user@musooka.local");
    const res = await request(app)
      .post(`/api/v1/notifications/${note.id}/read`)
      .set("Cookie", cookies);
    expect(res.status).toBe(404);
  });
});

describe("security — session expiry", () => {
  it("rejects session after manual expiry", async () => {
    const token = "manual-expiry-token-0123456789ab";
    await prisma.session.create({
      data: {
        userId: ids.requesterId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const cookies = [`${COOKIE_NAME}=${token}`];
    const ok = await request(app).get("/api/v1/auth/me").set("Cookie", cookies);
    expect(ok.status).toBe(200);

    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const expired = await request(app).get("/api/v1/auth/me").set("Cookie", cookies);
    expect(expired.status).toBe(401);
  });
});
