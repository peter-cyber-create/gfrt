import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { SEED_PASSWORD, ids, prisma } from "./helpers.js";

const app = createApp();

async function loginAs(email: string) {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: SEED_PASSWORD });
  expect(res.status).toBe(200);
  const cookie = res.headers["set-cookie"];
  expect(cookie).toBeTruthy();
  return Array.isArray(cookie) ? cookie : [cookie];
}

describe("authentication", () => {
  it("logs in successfully", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@musooka.local", password: SEED_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("admin@musooka.local");
    expect(res.body.data.user.permissions).toContain("user.manage");
  });

  it("rejects invalid password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@musooka.local", password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects inactive user", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "inactive@musooka.local", password: SEED_PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
  });

  it("returns current user and supports logout", async () => {
    const cookies = await loginAs("admin@musooka.local");
    const me = await request(app).get("/api/v1/auth/me").set("Cookie", cookies);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe("admin@musooka.local");

    const logout = await request(app).post("/api/v1/auth/logout").set("Cookie", cookies);
    expect(logout.status).toBe(204);

    const me2 = await request(app).get("/api/v1/auth/me").set("Cookie", cookies);
    expect(me2.status).toBe(401);
  });
});

describe("authorization", () => {
  it("allows permitted list requisitions", async () => {
    const cookies = await loginAs("user@musooka.local");
    const res = await request(app).get("/api/v1/requisitions").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("denies approve without requisition.approve", async () => {
    const cookies = await loginAs("user@musooka.local");
    const res = await request(app)
      .post(`/api/v1/requisitions/${ids.reviewReqId}/approve`)
      .set("Cookie", cookies)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("denies user.manage for requester", async () => {
    const cookies = await loginAs("user@musooka.local");
    const res = await request(app)
      .post("/api/v1/users")
      .set("Cookie", cookies)
      .send({
        email: "new@musooka.local",
        name: "New",
        password: "Password123!",
        roleId: ids.requesterRoleId,
      });
    expect(res.status).toBe(403);
  });

  it("prevents IDOR on notifications", async () => {
    const note = await prisma.notification.create({
      data: { userId: ids.adminId, text: "private to admin" },
    });
    const cookies = await loginAs("user@musooka.local");
    const res = await request(app)
      .post(`/api/v1/notifications/${note.id}/read`)
      .set("Cookie", cookies);
    expect(res.status).toBe(404);
  });
});

describe("requisitions", () => {
  it("creates, retrieves, submits, and rejects invalid transitions", async () => {
    const cookies = await loginAs("user@musooka.local");
    const created = await request(app)
      .post("/api/v1/requisitions")
      .set("Cookie", cookies)
      .send({
        facility: "Facility X",
        district: "District Y",
        departmentId: ids.departmentId,
        description: "New stock",
        amountValue: 500,
        items: [{ description: "Gloves", quantity: 10 }],
      });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const got = await request(app).get(`/api/v1/requisitions/${id}`).set("Cookie", cookies);
    expect(got.status).toBe(200);
    expect(got.body.data.number).toMatch(/^REQ-/);

    const submitted = await request(app)
      .post(`/api/v1/requisitions/${id}/submit`)
      .set("Cookie", cookies)
      .send({ note: "please review" });
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.status).toBe("SUBMITTED");

    const bad = await request(app)
      .post(`/api/v1/requisitions/${id}/complete`)
      .set("Cookie", cookies)
      .send({});
    expect(bad.status).toBe(422);
    expect(bad.body.error.code).toBe("REQUISITION_INVALID_STATE");
  });

  it("approves under-review requisition as reviewer and writes audit", async () => {
    const cookies = await loginAs("reviewer@musooka.local");
    const res = await request(app)
      .post(`/api/v1/requisitions/${ids.reviewReqId}/approve`)
      .set("Cookie", cookies)
      .send({ note: "ok" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("APPROVED");

    const history = await prisma.statusHistory.findMany({
      where: { requisitionId: ids.reviewReqId },
      orderBy: { createdAt: "asc" },
    });
    expect(history.at(-1)?.toStatus).toBe("APPROVED");

    const audit = await prisma.auditLog.findFirst({
      where: { action: "requisition.approve", entityId: ids.reviewReqId },
    });
    expect(audit?.actorId).toBe(ids.reviewerId);
  });

  it("rejects a requisition", async () => {
    const cookies = await loginAs("reviewer@musooka.local");
    const res = await request(app)
      .post(`/api/v1/requisitions/${ids.reviewReqId}/reject`)
      .set("Cookie", cookies)
      .send({ note: "incomplete" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("REJECTED");
  });
});

describe("validation", () => {
  it("rejects malformed login body", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid requisition id", async () => {
    const cookies = await loginAs("admin@musooka.local");
    const res = await request(app).get("/api/v1/requisitions/not-a-uuid").set("Cookie", cookies);
    expect(res.status).toBe(400);
  });
});

describe("ops", () => {
  it("health and ready", async () => {
    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
    const ready = await request(app).get("/ready");
    expect(ready.status).toBe(200);
    expect(ready.body.database).toBe(true);
  });
});

describe("database constraints", () => {
  it("enforces unique email", async () => {
    await expect(
      prisma.user.create({
        data: {
          email: "admin@musooka.local",
          name: "Dup",
          passwordHash: "x",
        },
      })
    ).rejects.toThrow();
  });
});
