import { describe, expect, it } from "vitest";
import { ownGroupSchema, ownGroupUpdateSchema, scheduleSettingsSchema } from "../src/validators/groups";

describe("group and schedule settings validators", () => {
  it("allows opening a group before its schedule is set", () => {
    expect(ownGroupSchema.safeParse({
      name: "B-1",
      courseId: "6f1c1f3e-8d0c-4b8e-9d57-2b7f0a9d1c11",
      startDate: "2026-11-09",
    }).success).toBe(true);
  });

  it("accepts extended weekday schedules and requires a start time when days are selected", () => {
    const base = {
      name: "B-1",
      courseId: "6f1c1f3e-8d0c-4b8e-9d57-2b7f0a9d1c11",
      startDate: "2026-11-09",
    };
    expect(ownGroupSchema.safeParse({ ...base, weekdays: [1, 2, 3, 4, 5, 6, 7], startTime: "09:00" }).success).toBe(true);
    expect(ownGroupSchema.safeParse({ ...base, weekdays: [1, 3, 5] }).success).toBe(false);
    expect(ownGroupUpdateSchema.safeParse({ days: null, weekdays: [], startTime: null }).success).toBe(true);
  });

  it("validates working hours, lesson duration and break duration", () => {
    expect(scheduleSettingsSchema.safeParse({
      workStart: "08:00",
      workEnd: "20:00",
      lessonMinutes: 90,
      breakMinutes: 15,
    }).success).toBe(true);
    expect(scheduleSettingsSchema.safeParse({
      workStart: "20:00",
      workEnd: "08:00",
      lessonMinutes: 90,
      breakMinutes: 15,
    }).success).toBe(false);
    expect(scheduleSettingsSchema.safeParse({
      workStart: "08:00",
      workEnd: "20:00",
      lessonMinutes: 241,
      breakMinutes: 15,
    }).success).toBe(false);
  });
});
