import { describe, expect, it } from "vitest";
import { accountIdFilter, formatAccountId } from "../src/lib/accountNumbers";

describe("account numbers", () => {
  it("shows user#### until a course is bought, then student####", () => {
    expect(formatAccountId({ userNumber: 7, studentNumber: null })).toBe("user0007");
    expect(formatAccountId({ userNumber: 7, studentNumber: 3 })).toBe("student0003");
    expect(formatAccountId({ userNumber: 12345, studentNumber: null })).toBe("user12345");
  });

  it("turns a typed id into a filter on the right number", () => {
    expect(accountIdFilter("student0003")).toEqual({ studentNumber: 3 });
    expect(accountIdFilter("USER0042")).toEqual({ userNumber: 42 });
    expect(accountIdFilter("#42")).toEqual({ OR: [{ userNumber: 42 }, { studentNumber: 42 }] });
    expect(accountIdFilter("Ali")).toBeNull();
    expect(accountIdFilter("+998901234567")).toBeNull();
  });
});
