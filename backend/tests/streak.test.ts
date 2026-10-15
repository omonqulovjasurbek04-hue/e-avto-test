import { describe, expect, it } from "vitest";
import { studyStreak } from "../src/services/user.service";

// Helper: a moment given in Tashkent local time (UTC+5).
const tk = (iso: string) => new Date(`${iso}+05:00`);

describe("studyStreak (Tashkent days)", () => {
  const now = tk("2026-10-15T12:00:00");

  it("counts consecutive local days back from today", () => {
    expect(studyStreak([tk("2026-10-15T09:00:00"), tk("2026-10-14T21:00:00"), tk("2026-10-13T08:00:00")], now)).toBe(3);
  });

  it("keeps yesterday's streak alive before today's test", () => {
    expect(studyStreak([tk("2026-10-14T10:00:00"), tk("2026-10-13T10:00:00")], now)).toBe(2);
  });

  it("does not join two non-consecutive local days that happen to be consecutive in UTC", () => {
    // Mon 23:00 Tashkent = Mon 18:00Z; Wed 03:00 Tashkent = Tue 22:00Z -> consecutive UTC days, but a gap locally.
    const wednesday = tk("2026-10-14T12:00:00");
    expect(studyStreak([tk("2026-10-12T23:00:00"), tk("2026-10-14T03:00:00")], wednesday)).toBe(1);
  });

  it("treats a test just after local midnight as the new day", () => {
    // 00:30 Tashkent on the 15th is still the 14th in UTC.
    expect(studyStreak([tk("2026-10-15T00:30:00"), tk("2026-10-14T10:00:00")], now)).toBe(2);
  });

  it("is zero without recent tests", () => {
    expect(studyStreak([], now)).toBe(0);
    expect(studyStreak([tk("2026-10-10T10:00:00")], now)).toBe(0);
  });
});
