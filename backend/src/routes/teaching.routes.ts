import { Router, Response } from "express";
import { z } from "zod";
import * as groups from "../services/group.service";
import * as attendance from "../services/attendance.service";
import { authMiddleware, requireUserId, AuthRequest } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/admin.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { success } from "../utils/apiResponse";
import { attendanceSchema, groupSchema, groupUpdateSchema, memberSchema, slotSchema, slotUpdateSchema } from "../validators/groups";

const uuid = z.string().uuid();
const actorOf = (req: AuthRequest) => ({ userId: requireUserId(req), role: req.user!.role });
const h = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => asyncHandler(fn as never);

const rangeSchema = z.object({
  from: z.coerce.date().default(() => new Date()),
  to: z.coerce.date().default(() => new Date(Date.now() + 30 * 86_400_000)),
});

// ───────────── staff: /api/groups, /api/slots (teachers see only their own; admins all) ─────────────
export const staffRoutes = Router();
staffRoutes.use(["/groups", "/slots", "/teacher"], asyncHandler(authMiddleware));
staffRoutes.use(["/groups", "/slots", "/teacher"], requirePermission("teaching:access"));

staffRoutes.get("/groups", h(async (req, res) => success(res, await groups.listGroups(actorOf(req)))));
staffRoutes.get("/groups/:id", h(async (req, res) => success(res, await groups.getGroup(actorOf(req), uuid.parse(req.params.id)))));
staffRoutes.get("/groups/:id/slots", h(async (req, res) => success(res, await groups.listSlots(actorOf(req), uuid.parse(req.params.id)))));
staffRoutes.get("/groups/:id/attendance-report", h(async (req, res) => success(res, await attendance.groupReport(actorOf(req), uuid.parse(req.params.id)))));
staffRoutes.get(
  "/groups/:id/attendance-report.csv",
  h(async (req, res) => {
    const csv = await attendance.groupReportCsv(actorOf(req), uuid.parse(req.params.id));
    res.type("text/csv").set("Content-Disposition", 'attachment; filename="attendance.csv"').send(csv);
  })
);

staffRoutes.get("/teacher/schedule", h(async (req, res) => {
  const { from, to } = rangeSchema.parse(req.query);
  success(res, await groups.mySchedule(actorOf(req), from, to));
}));

staffRoutes.patch("/slots/:id", h(async (req, res) => success(res, await groups.updateSlot(actorOf(req), uuid.parse(req.params.id), slotUpdateSchema.parse(req.body)))));
staffRoutes.get("/slots/:id/attendance", h(async (req, res) => success(res, await attendance.getSessionRoster(actorOf(req), uuid.parse(req.params.id)))));
staffRoutes.put("/slots/:id/attendance", h(async (req, res) => {
  const { records, reason } = attendanceSchema.parse(req.body);
  success(res, await attendance.markAttendance(actorOf(req), uuid.parse(req.params.id), records, reason));
}));
staffRoutes.post("/slots/:id/attendance/finalize", h(async (req, res) => success(res, await attendance.finalizeSession(actorOf(req), uuid.parse(req.params.id)))));

// ───────────── admin: /api/admin/groups ─────────────
export const adminGroupRoutes = Router();
adminGroupRoutes.use(asyncHandler(authMiddleware));
adminGroupRoutes.use(requirePermission("groups:manage"));

adminGroupRoutes.post("/", h(async (req, res) => success(res, await groups.createGroup(requireUserId(req), groupSchema.parse(req.body)), 201)));
adminGroupRoutes.put("/:id", h(async (req, res) => success(res, await groups.updateGroup(requireUserId(req), uuid.parse(req.params.id), groupUpdateSchema.parse(req.body)))));
adminGroupRoutes.delete("/:id", h(async (req, res) => success(res, await groups.archiveGroup(requireUserId(req), uuid.parse(req.params.id)))));
adminGroupRoutes.post("/:id/members", h(async (req, res) => success(res, await groups.addMember(requireUserId(req), uuid.parse(req.params.id), memberSchema.parse(req.body).studentId), 201)));
adminGroupRoutes.delete("/:id/members/:studentId", h(async (req, res) => success(res, await groups.removeMember(requireUserId(req), uuid.parse(req.params.id), uuid.parse(req.params.studentId)))));
adminGroupRoutes.post("/:id/slots", h(async (req, res) => {
  success(res, await groups.createSlots(actorOf(req), uuid.parse(req.params.id), slotSchema.parse(req.body)), 201);
}));

// ───────────── student: /api/me/schedule, /api/me/attendance ─────────────
export const studentTeachingRoutes = Router();
studentTeachingRoutes.use("/me", asyncHandler(authMiddleware));
studentTeachingRoutes.get("/me/schedule", h(async (req, res) => {
  const { from, to } = rangeSchema.parse(req.query);
  success(res, await groups.studentSchedule(requireUserId(req), from, to));
}));
studentTeachingRoutes.get("/me/attendance", h(async (req, res) => success(res, await attendance.myAttendance(requireUserId(req)))));
