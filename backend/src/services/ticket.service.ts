import { prisma } from "../config/database";
import { badRequest, notFound } from "../utils/errors";
import { writeAudit } from "./audit.service";
import * as courseService from "./course.service";
import { ticketQuestions } from "./test.service";
import { TICKET_COUNT, TICKET_SIZE } from "../validators/test";
import type { TicketQuestionInput } from "../validators/ticket";

/**
 * Exam tickets for teachers: see what each of the course's 60 tickets holds, add questions to one, edit or
 * remove them. A ticket is "automatic" (cut from the course pool) until a teacher changes it; then its
 * current questions are pinned to it, so adding or removing one changes only that ticket.
 */

const POOL_SELECT = { id: true, ticket: true, order: true } as const;

/** Every published question of the course that can be served in a ticket. */
const coursePool = (courseId: string) =>
  prisma.question.findMany({ where: { courseId, isPublished: true }, select: POOL_SELECT });

const ensureCourse = async (courseId: string) => {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, title: true } });
  if (!course) throw notFound("Course not found");
  return course;
};

const ensureTicket = (ticket: number) => {
  if (!Number.isInteger(ticket) || ticket < 1 || ticket > TICKET_COUNT) throw badRequest("Unknown ticket");
};

/** The course's tickets: how many questions each has and whether a teacher has set it up by hand. */
export const listTickets = async (courseId: string) => {
  const course = await ensureCourse(courseId);
  const pool = await coursePool(courseId);
  const tickets = Array.from({ length: TICKET_COUNT }, (_, i) => {
    const n = i + 1;
    return { ticket: n, questions: ticketQuestions(pool, courseId, n).length, custom: pool.some((q) => q.ticket === n) };
  });
  return { course, size: TICKET_SIZE, tickets };
};

/** One ticket with its full questions (answer key included) and the course's lessons to file them under. */
export const getTicket = async (courseId: string, ticket: number) => {
  ensureTicket(ticket);
  const course = await ensureCourse(courseId);
  const pool = await coursePool(courseId);
  const ids = ticketQuestions(pool, courseId, ticket).map((q) => q.id);
  const rows = await prisma.question.findMany({
    where: { id: { in: ids } },
    select: { id: true, text: true, imageUrl: true, options: true, correctIndex: true, explanation: true, lessonId: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const lessons = await prisma.lesson.findMany({ where: { courseId }, orderBy: { order: "asc" }, select: { id: true, title: true } });
  return {
    course,
    ticket,
    custom: pool.some((q) => q.ticket === ticket),
    questions: ids.map((id) => byId.get(id)!).map((q) => ({ ...q, options: q.options as string[] })),
    lessons,
  };
};

/** Pins an automatic ticket's current questions to it, so a change touches only this ticket. */
const pinTicket = async (courseId: string, ticket: number) => {
  const pool = await coursePool(courseId);
  if (pool.some((q) => q.ticket === ticket)) return;
  const current = ticketQuestions(pool, courseId, ticket);
  await prisma.$transaction(current.map((q, i) => prisma.question.update({ where: { id: q.id }, data: { ticket, order: i + 1 } })));
};

/** A question of this course, or 404 (a teacher never edits another course's questions through a ticket). */
const ownQuestion = async (courseId: string, questionId: string) => {
  const q = await prisma.question.findFirst({ where: { id: questionId, courseId, isPublished: true } });
  if (!q) throw notFound("Question not found");
  return q;
};

const lessonOf = async (courseId: string, lessonId: string | null | undefined) => {
  if (!lessonId) return null;
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, courseId }, select: { id: true } });
  if (!lesson) throw badRequest("The topic is not part of this course");
  return lesson.id;
};

export const addQuestion = async (actorId: string, courseId: string, ticket: number, input: TicketQuestionInput) => {
  ensureTicket(ticket);
  await ensureCourse(courseId);
  const lessonId = await lessonOf(courseId, input.lessonId);
  await pinTicket(courseId, ticket);
  const last = await prisma.question.aggregate({ where: { courseId, ticket }, _max: { order: true } });
  const q = await prisma.question.create({
    data: {
      courseId,
      lessonId,
      ticket,
      order: (last._max.order ?? 0) + 1,
      text: input.text,
      imageUrl: input.imageUrl ?? null,
      options: input.options,
      correctIndex: input.correctIndex,
      explanation: input.explanation ?? null,
    },
  });
  await writeAudit({ actorId, action: "question.create", entity: "Question", entityId: q.id, after: q });
  return q;
};

export const updateQuestion = async (actorId: string, courseId: string, questionId: string, input: TicketQuestionInput) => {
  await ownQuestion(courseId, questionId);
  const lessonId = await lessonOf(courseId, input.lessonId);
  // The shared editor keeps the edit history and refuses to change the option count of an answered question.
  return courseService.updateQuestion(
    questionId,
    { text: input.text, imageUrl: input.imageUrl ?? null, options: input.options, correctIndex: input.correctIndex, explanation: input.explanation ?? null, lessonId },
    actorId
  );
};

/**
 * Takes a question out of the ticket. It is unpublished, not deleted: students' past answers to it (their
 * results and mistakes history) stay intact.
 */
export const removeQuestion = async (actorId: string, courseId: string, ticket: number, questionId: string) => {
  ensureTicket(ticket);
  const existing = await ownQuestion(courseId, questionId);
  await pinTicket(courseId, ticket);
  await prisma.question.update({ where: { id: questionId }, data: { isPublished: false, ticket: null } });
  await writeAudit({ actorId, action: "question.remove_from_ticket", entity: "Question", entityId: questionId, before: existing, after: { ticket } });
  return { removed: true };
};

/** Gives the ticket back to automatic selection: its questions return to the shared pool. */
export const resetTicket = async (actorId: string, courseId: string, ticket: number) => {
  ensureTicket(ticket);
  await ensureCourse(courseId);
  const { count } = await prisma.question.updateMany({ where: { courseId, ticket }, data: { ticket: null } });
  await writeAudit({ actorId, action: "ticket.reset", entity: "Course", entityId: courseId, after: { ticket, questions: count } });
  return { reset: count };
};
