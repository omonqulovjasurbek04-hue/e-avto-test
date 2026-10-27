import { describe, expect, it } from "vitest";
import { accountIdFilter, formatAccountId } from "../src/lib/accountNumbers";

describe("account numbers", () => {
  it("shows user#### until a course is bought, then student####, and teacher#### for a teacher", () => {
    expect(formatAccountId({ userNumber: 2, studentNumber: null })).toBe("user0002");
    expect(formatAccountId({ userNumber: 2, studentNumber: 7 })).toBe("student0007");
    expect(formatAccountId({ userNumber: null, studentNumber: 7, teacherNumber: 3, role: "TEACHER" })).toBe("teacher0003");
    // No longer a teacher: the number they hold now.
    expect(formatAccountId({ userNumber: 12, studentNumber: null, teacherNumber: 3, role: "USER" })).toBe("user0012");
  });

  it("keeps counting past user9999 and user99999: no limit, at least four digits", () => {
    expect(formatAccountId({ userNumber: 9999, studentNumber: null })).toBe("user9999");
    expect(formatAccountId({ userNumber: 10000, studentNumber: null })).toBe("user10000");
    expect(formatAccountId({ userNumber: 99999, studentNumber: 99999 })).toBe("student99999");
    expect(formatAccountId({ userNumber: 100000, studentNumber: null })).toBe("user100000");
  });

  it("turns a typed id into a filter on the right number", () => {
    expect(accountIdFilter("student0003")).toEqual({ studentNumber: 3 });
    expect(accountIdFilter("USER0042")).toEqual({ userNumber: 42 });
    expect(accountIdFilter("user10000")).toEqual({ userNumber: 10000 });
    expect(accountIdFilter("student123456")).toEqual({ studentNumber: 123456 });
    expect(accountIdFilter("#42")).toEqual({ OR: [{ userNumber: 42 }, { studentNumber: 42 }, { teacherNumber: 42 }] });
    expect(accountIdFilter("teacher0003")).toEqual({ teacherNumber: 3 });
    expect(accountIdFilter("Ali")).toBeNull();
    // 7+ digits without a prefix are a phone number, not an id.
    expect(accountIdFilter("901234567")).toBeNull();
    expect(accountIdFilter("+998901234567")).toBeNull();
  });

  it("never sends the database a number it cannot hold", () => {
    expect(accountIdFilter("user9999999999")).toEqual({ id: { in: [] } });
    expect(accountIdFilter("student0")).toEqual({ id: { in: [] } });
  });
});
