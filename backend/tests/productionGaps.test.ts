import { describe, expect, it } from "vitest";
import { lineTotalUgx, requisitionTotalUgx } from "../src/lib/money.js";
import { changePassword, verifyPassword, hashPassword } from "../src/services/authService.js";
import { createRequisition, updateDraftRequisition, getRequisition } from "../src/services/requisitionService.js";
import { ids, prisma, SEED_PASSWORD } from "./helpers.js";
import { loadAuthUser } from "../src/services/authService.js";

describe("money totals", () => {
  it("computes integer line and requisition totals", () => {
    expect(lineTotalUgx({ quantity: 3, unitCost: 1500 })).toBe(4500);
    expect(requisitionTotalUgx([{ quantity: 2, unitCost: 100 }, { quantity: 1, unitCost: 50 }])).toBe(250);
  });
});

describe("change password", () => {
  it("rejects wrong current password", async () => {
    await expect(changePassword(ids.adminId, "wrong", "NewPassword123!")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  });

  it("updates hash and invalidates sessions", async () => {
    await prisma.session.create({
      data: {
        userId: ids.adminId,
        tokenHash: "a".repeat(64),
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    await changePassword(ids.adminId, SEED_PASSWORD, "ChangedPass123!");
    const user = await prisma.user.findUnique({ where: { id: ids.adminId } });
    expect(await verifyPassword(user!.passwordHash, "ChangedPass123!")).toBe(true);
    expect(await prisma.session.count({ where: { userId: ids.adminId } })).toBe(0);
    // restore for other tests
    await prisma.user.update({
      where: { id: ids.adminId },
      data: { passwordHash: await hashPassword(SEED_PASSWORD) },
    });
  });
});

describe("requisition create/update totals", () => {
  it("recalculates amount from items and ignores client amountValue", async () => {
    const actor = await loadAuthUser(ids.requesterId);
    const created = await createRequisition(actor!, {
      facility: "Mulago NRH",
      district: "Kampala",
      departmentId: ids.departmentId,
      description: "Test kits",
      amountValue: 1, // should be ignored
      items: [
        { description: "Kit A", quantity: 10, unit: "box", unitCost: 2500 },
        { description: "Kit B", quantity: 2, unit: "pack", unitCost: 1000 },
      ],
    });
    expect(created.amountValue).toBe(10 * 2500 + 2 * 1000);

    const updated = await updateDraftRequisition(actor!, created.id, {
      items: [{ description: "Kit A", quantity: 4, unit: "box", unitCost: 2500 }],
    });
    expect(updated.amountValue).toBe(10000);

    const full = await getRequisition(created.id);
    expect(full.items).toHaveLength(1);
  });

  it("rejects update when not draft", async () => {
    const actor = await loadAuthUser(ids.requesterId);
    await expect(
      updateDraftRequisition(actor!, ids.reviewReqId, { description: "Nope" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
