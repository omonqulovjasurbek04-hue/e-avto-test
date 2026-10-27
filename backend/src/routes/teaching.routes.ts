import { Router, Response } from "express";
import { z } from "zod";
import * as groups from "../services/group.service";
import * as attendance from "../services/attendance.service";
import * as knowledge from "../services/knowledge.service";
import * as tickets from "../services/ticket.service";
import * as media from "../services/media.service";
import { ticketQuestionSchema } from "../validators/ticket";
import { authMiddleware, requireUserId, AuthRequest } from "../middleware/auth.middleware";
import { requireAnyPermission, requirePermission } from "../middleware/admin.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { success } from "../utils/apiResponse";
import { hasPermission } from "../lib/permissions";
import { attendanceSchema, groupSchema, groupUpdateSchema, memberSchema, ownGroupSchema, ownGroupUpdateSchema, slotSchema, slotUpdateSchema } from "../validators/groups";

const uuid = z.string().uuid();
const actorOf = (req: AuthRequest) => ({ userId: requireUserId(req), role: req.user!.role });
const h = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => asyncHandler(fn as never);

const rangeSchema = z.object({
  from: z.coerce.date().default(() => new Date()),
  to: z.coerce.date().default(() => new Date(Date.now() + 30 * 86_400_000)),
});

// ───────────── staff: /api/groups, /api/slots (teachers see only their own; groups:manage sees all) ─────────────
// Group planners (MANAGER) read groups and slots here too; marking attendance is still checked per action.
export const staffRoutes = Router();
staffRoutes.use(["/groups", "/slots", "/teacher"], asyncHandler(authMiddleware));
staffRoutes.use(["/groups", "/slots", "/teacher"], requireAnyPermission("teaching:access", "groups:manage"));

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

// A teacher opens and runs their own groups (groups:own); admins can use the same calls for any group.
const groupWriters = requireAnyPermission("groups:manage", "groups:own");
const isPlanner = (req: AuthRequest) => hasPermission(req.user!.role, "groups:manage");
staffRoutes.post("/groups", groupWriters, h(async (req, res) => {
  const body = isPlanner(req) ? groupSchema.parse(req.body) : ownGroupSchema.parse(req.body);
  success(res, await groups.createGroup(actorOf(req), body), 201);
}));
staffRoutes.put("/groups/:id", groupWriters, h(async (req, res) => {
  const body = isPlanner(req) ? groupUpdateSchema.parse(req.body) : ownGroupUpdateSchema.parse(req.body);
  success(res, await groups.updateGroup(actorOf(req), uuid.parse(req.params.id), body));
}));
staffRoutes.delete("/groups/:id", groupWriters, h(async (req, res) => success(res, await groups.archiveGroup(actorOf(req), uuid.parse(req.params.id)))));
staffRoutes.post("/groups/:id/members", groupWriters, h(async (req, res) => success(res, await groups.addMember(actorOf(req), uuid.parse(req.params.id), memberSchema.parse(req.body).studentId), 201)));
staffRoutes.delete("/groups/:id/members/:studentId", groupWriters, h(async (req, res) => success(res, await groups.removeMember(actorOf(req), uuid.parse(req.params.id), uuid.parse(req.params.studentId)))));
staffRoutes.post("/groups/:id/slots", groupWriters, h(async (req, res) => success(res, await groups.createSlots(actorOf(req), uuid.parse(req.params.id), slotSchema.parse(req.body)), 201)));
staffRoutes.get("/teacher/students", groupWriters, h(async (req, res) => {
  const { search } = z.object({ search: z.string().max(80).default("") }).parse(req.query);
  success(res, await groups.searchStudents(search));
}));

// Knowledge control: a group's test activity for the last 7 days, and one student's mistakes.
staffRoutes.get("/teacher/knowledge", h(async (req, res) => {
  const { groupId, teacherId } = z.object({ groupId: uuid.optional(), teacherId: uuid.optional() }).parse(req.query);
  success(res, await knowledge.groupKnowledge(actorOf(req), groupId, teacherId));
}));
// Admin: every teacher with their groups' activity (group managers only).
staffRoutes.get("/teacher/knowledge/teachers", requirePermission("groups:manage"), h(async (_req, res) => success(res, await knowledge.teachersOverview())));
staffRoutes.get("/teacher/students/:id/knowledge", h(async (req, res) => success(res, await knowledge.studentKnowledge(actorOf(req), uuid.parse(req.params.id)))));
// Exam tickets: what each ticket holds, and adding, editing or removing its questions.
const ticketEditors = requirePermission("tickets:edit");
const ticketParams = (req: AuthRequest) => ({
  courseId: uuid.parse(req.params.courseId),
  ticket: z.coerce.number().int().parse(req.params.ticket),
});
staffRoutes.get("/teacher/courses/:courseId/tickets", ticketEditors, h(async (req, res) => success(res, await tickets.listTickets(uuid.parse(req.params.courseId)))));
staffRoutes.get("/teacher/courses/:courseId/tickets/:ticket", ticketEditors, h(async (req, res) => {
  const { courseId, ticket } = ticketParams(req);
  success(res, await tickets.getTicket(courseId, ticket));
}));
staffRoutes.post("/teacher/courses/:courseId/tickets/:ticket/questions", ticketEditors, h(async (req, res) => {
  const { courseId, ticket } = ticketParams(req);
  success(res, await tickets.addQuestion(requireUserId(req), courseId, ticket, ticketQuestionSchema.parse(req.body)), 201);
}));
staffRoutes.put("/teacher/courses/:courseId/questions/:id", ticketEditors, h(async (req, res) => {
  success(res, await tickets.updateQuestion(requireUserId(req), uuid.parse(req.params.courseId), uuid.parse(req.params.id), ticketQuestionSchema.parse(req.body)));
}));
staffRoutes.delete("/teacher/courses/:courseId/tickets/:ticket/questions/:id", ticketEditors, h(async (req, res) => {
  const { courseId, ticket } = ticketParams(req);
  success(res, await tickets.removeQuestion(requireUserId(req), courseId, ticket, uuid.parse(req.params.id)));
}));
staffRoutes.delete("/teacher/courses/:courseId/tickets/:ticket/questions", ticketEditors, h(async (req, res) => {
  const { courseId, ticket } = ticketParams(req);
  success(res, await tickets.resetTicket(requireUserId(req), courseId, ticket));
}));
// A picture for a ticket question (same checks as every uploaded image).
staffRoutes.put("/teacher/images", ticketEditors, h(async (req, res) => {
  const length = Number(req.headers["content-length"]);
  success(res, await media.uploadImage({ userId: requireUserId(req), role: req.user!.role }, req, { contentLength: Number.isFinite(length) && length > 0 ? length : undefined }), 201);
}));
// The teacher's dashboard numbers and lists (own groups only).
staffRoutes.get("/teacher/overview", h(async (req, res) => success(res, await groups.teacherOverview(actorOf(req)))));
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

adminGroupRoutes.post("/", h(async (req, res) => success(res, await groups.createGroup(actorOf(req), groupSchema.parse(req.body)), 201)));
adminGroupRoutes.put("/:id", h(async (req, res) => success(res, await groups.updateGroup(actorOf(req), uuid.parse(req.params.id), groupUpdateSchema.parse(req.body)))));
adminGroupRoutes.delete("/:id", h(async (req, res) => success(res, await groups.archiveGroup(actorOf(req), uuid.parse(req.params.id)))));
adminGroupRoutes.post("/:id/members", h(async (req, res) => success(res, await groups.addMember(actorOf(req), uuid.parse(req.params.id), memberSchema.parse(req.body).studentId), 201)));
adminGroupRoutes.delete("/:id/members/:studentId", h(async (req, res) => success(res, await groups.removeMember(actorOf(req), uuid.parse(req.params.id), uuid.parse(req.params.studentId)))));
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
