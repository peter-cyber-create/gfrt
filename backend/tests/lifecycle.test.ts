import { describe, expect, it } from "vitest";
import { ALLOWED_TRANSITIONS, assertTransition } from "../src/domain/requisitionLifecycle.js";
import { AppError } from "../src/lib/errors.js";

describe("requisition lifecycle", () => {
  it("allows draft to submitted", () => {
    expect(() => assertTransition("DRAFT", "SUBMITTED")).not.toThrow();
  });

  it("blocks draft to approved", () => {
    expect(() => assertTransition("DRAFT", "APPROVED")).toThrow(AppError);
  });

  it("completed has no outbound transitions", () => {
    expect(ALLOWED_TRANSITIONS.COMPLETED).toEqual([]);
  });
});
