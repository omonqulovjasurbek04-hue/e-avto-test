import { describe, expect, it } from "vitest";
import { expandRecurrence, findConflicts, overlaps } from "../src/lib/schedule";
import { csvCell, summarize, toCsv } from "../src/lib/attendance";

const t = (h: number, d = 1) => new Date(Date.UTC(2026, 5, d, h));

describe("overlaps", () => {
  it("detects overlap and allows back-to-back lessons", () => {
    expect(overlaps({ startsAt: t(9), endsAt: t(11) }, { startsAt: t(10), endsAt: t(12) })).toBe(true);
    expect(overlaps({ startsAt: t(9), endsAt: t(10) }, { startsAt: t(10), endsAt: t(11) })).toBe(false);
  });
});

describe("expandRecurrence", () => {
  it("returns the single slot without a rule", () => {
    expect(expandRecurrence({ startsAt: t(9), endsAt: t(10) })).toHaveLength(1);
  });
  it("repeats weekly with the same duration", () => {
    const out = expandRecurrence({ startsAt: t(9), endsAt: t(10, 1) }, { everyWeeks: 1, count: 3 });
    expect(out.map((s) => s.startsAt.getUTCDate())).toEqual([1, 8, 15]);
  });
  it("rejects absurd or invalid rules and inverted intervals", () => {
    expect(() => expandRecurrence({ startsAt: t(9), endsAt: t(10) }, { everyWeeks: 1, count: 500 })).toThrow();
    expect(() => expandRecurrence({ startsAt: t(9), endsAt: t(10) }, { everyWeeks: 0, count: 2 })).toThrow();
    expect(() => expandRecurrence({ startsAt: t(10), endsAt: t(9) })).toThrow();
  });
});

describe("findConflicts", () => {
  const existing = [{ id: "s1", startsAt: t(9), endsAt: t(11), teacherId: "T1", room: "A-1", groupId: "g1" }];
  it("flags the same teacher or the same room, not unrelated overlaps", () => {
    expect(findConflicts({ startsAt: t(10), endsAt: t(12), teacherId: "T1", room: null }, existing)).toEqual([{ slotId: "s1", kind: "teacher" }]);
    expect(findConflicts({ startsAt: t(10), endsAt: t(12), teacherId: "T2", room: "a-1" }, existing)).toEqual([{ slotId: "s1", kind: "room" }]);
    expect(findConflicts({ startsAt: t(10), endsAt: t(12), teacherId: "T2", room: "B-2" }, existing)).toEqual([]);
    expect(findConflicts({ startsAt: t(11), endsAt: t(12), teacherId: "T1", room: "A-1" }, existing)).toEqual([]);
  });
});

describe("attendance summary", () => {
  it("counts present/late/online as attended and removes excused from the denominator", () => {
    const s = summarize(["PRESENT", "LATE", "ONLINE", "ABSENT", "EXCUSED"]);
    expect(s).toMatchObject({ total: 5, present: 1, late: 1, online: 1, absent: 1, excused: 1, percent: 75 });
  });
  it("returns null percent when nothing counts", () => {
    expect(summarize([]).percent).toBeNull();
    expect(summarize(["EXCUSED"]).percent).toBeNull();
  });
});

describe("csv export", () => {
  it("defuses formula injection and quotes special characters", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("a,b")).toBe("\"a,b\"");
    expect(csvCell("-5+3")).toBe("'-5+3");
    expect(toCsv(["n", "s"], [["Ali", "PRESENT"]])).toBe("n,s\r\nAli,PRESENT");
  });
});
