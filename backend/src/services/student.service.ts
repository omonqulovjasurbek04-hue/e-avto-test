import { prisma } from "../config/database";
import { notFound } from "../utils/errors";
import { isEnrollmentActive } from "./access.service";
import { listForUser } from "./notification.service";

/** Every query below is scoped by userId: a student can only ever read their own rows. */

export const listEnrollments = async (userId: string) => {
  const rows = await prisma.enrollment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { id: true, title: true, thumbnail: true } },
      package: { select: { id: true, name: true } },
    },
  });
  return rows.map((e) => ({ ...e, isActive: isEnrollmentActive(e) }));
};

export const listNotifications = (userId: string) => listForUser(userId);

export const markNotificationRead = async (userId: string, id: string) => {
  // updateMany with userId in the filter: someone else's id is simply "not found".
  const res = await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
  if (res.count === 0) {
    const exists = await prisma.notification.findFirst({ where: { id, userId }, select: { id: true } });
    if (!exists) throw notFound("Notification not found");
  }
  return { id, read: true };
};

export const markAllNotificationsRead = async (userId: string) => {
  const res = await prisma.notification.updateMany({ where: { userId, inApp: true, readAt: null }, data: { readAt: new Date() } });
  return { updated: res.count };
};
