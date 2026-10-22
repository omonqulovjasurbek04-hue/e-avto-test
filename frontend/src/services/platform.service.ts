import { apiDelete, apiGet, apiGetPage, apiPatch, apiPost, apiPut, apiClient } from "./api";

/* ───────── shared types (mirror the backend responses) ───────── */

export interface PackagePrice {
  amount: number;
  currency: string;
  isSample: boolean;
}
export interface PublicPackage {
  id: string;
  courseId: string;
  name: string;
  description: string | null;
  durationDays: number | null;
  course: { id: string; title: string };
  price: PackagePrice;
}
export interface Quote {
  packageId: string;
  currency: string;
  isSample: boolean;
  subtotal: number;
  discountTotal: number;
  total: number;
  couponApplied: boolean;
  couponRejection?: string;
}

export interface OrderPayment {
  id: string;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  paidAt: string | null;
}
export interface Order {
  id: string;
  status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  subtotal: number;
  discountTotal: number;
  total: number;
  currency: string;
  createdAt: string;
  expiresAt: string | null;
  items: { id: string; title: string; unitAmount: number }[];
  payments: OrderPayment[];
  redirectUrl?: string | null;
}

export interface Enrollment {
  id: string;
  isActive: boolean;
  status: string;
  expiresAt: string | null;
  course: { id: string; title: string; thumbnail: string | null };
  package: { id: string; name: string } | null;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPrefs {
  inApp: boolean;
  email: boolean;
  attendance: boolean;
  /** Language of notices and e-mails. */
  language: "uz" | "uz_cyrl" | "ru";
}

export interface ScheduleItem {
  id: string;
  startsAt: string;
  endsAt: string;
  room: string | null;
  onlineUrl: string | null;
  topic: string | null;
  status: "PLANNED" | "DONE" | "CANCELLED";
  group: { id: string; name: string };
}

export interface MyGroup {
  id: string;
  name: string;
  course: string;
  /** ODD = Mon/Wed/Fri (toq kunlar), EVEN = Tue/Thu/Sat (juft kunlar). */
  days: "ODD" | "EVEN" | "CUSTOM";
  /** 1 = Monday … 7 = Sunday. */
  weekdays: number[];
  time: string | null;
}

export interface StudyWeek {
  today: string;
  totalMinutes: number;
  days: { date: string; lessonMinutes: number; testMinutes: number }[];
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "ONLINE";
export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  online: number;
  percent: number | null;
}
export interface MyAttendance {
  summary: AttendanceSummary;
  records: { status: AttendanceStatus; note: string | null; session: { slot: { startsAt: string; topic: string | null; status: string; group: { name: string } } } }[];
}

export type GroupDays = "ODD" | "EVEN";

/** What opening (or editing) a group sends. A teacher's own group has no teacherId: it is always theirs. */
export interface GroupInput {
  name: string;
  courseId: string;
  teacherId?: string;
  startDate: string;
  endDate?: string | null;
  capacity: number;
  days?: GroupDays | null;
  startTime?: string | null;
  lessonMinutes?: number | null;
  room?: string | null;
}

export interface StudentHit {
  id: string;
  name: string;
  phone: string | null;
  userNumber: number;
  studentNumber: number | null;
}

export interface Group {
  id: string;
  name: string;
  courseId: string;
  teacherId: string;
  startDate: string;
  endDate: string | null;
  capacity: number;
  /** Weekly rhythm: ODD = toq kunlar (Du/Chor/Ju), EVEN = juft kunlar (Se/Pay/Sha); null = lessons planned one by one. */
  days: GroupDays | null;
  /** "HH:MM", Tashkent time. */
  startTime: string | null;
  lessonMinutes: number | null;
  room: string | null;
  status: "ACTIVE" | "ARCHIVED";
  course: { id: string; title: string };
  teacher: { id: string; name: string };
  _count: { members: number };
}
export interface GroupDetail extends Omit<Group, "_count"> {
  members: { studentId: string; student: { id: string; name: string; phone: string | null } }[];
}
export interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  room: string | null;
  onlineUrl: string | null;
  topic: string | null;
  status: "PLANNED" | "DONE" | "CANCELLED";
  session: { id: string; finalizedAt: string | null } | null;
}
export interface Roster {
  slot: { id: string; startsAt: string; endsAt: string; status: string; onlineUrl: string | null; finalizedAt: string | null };
  students: { studentId: string; name: string; status: AttendanceStatus | null; note: string | null }[];
}

export interface AdminPackage {
  id: string;
  courseId: string;
  name: string;
  description: string | null;
  durationDays: number | null;
  isActive: boolean;
  archivedAt: string | null;
  course: { id: string; title: string };
  prices: { id: string; amount: number; currency: string; validFrom: string; validTo: string | null; isSample: boolean }[];
}
export interface Discount {
  id: string;
  name: string;
  type: "PERCENT" | "FIXED";
  value: number;
  packageId: string | null;
  endsAt: string | null;
  isActive: boolean;
}
export interface Coupon {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  maxRedemptions: number | null;
  redeemedCount: number;
  minOrderAmount: number;
  expiresAt: string | null;
  isActive: boolean;
}

export interface AdminOrder {
  id: string;
  status: Order["status"];
  total: number;
  currency: string;
  createdAt: string;
  user: { id: string; name: string; email: string | null };
  items: { title: string; unitAmount: number }[];
  payments: OrderPayment[];
}
export interface RefundRow {
  id: string;
  amount: number;
  reason: string;
  status: "PENDING" | "DONE" | "REJECTED";
  createdAt: string;
  payment: { id: string; amount: number; currency: string; order: { id: string; user: { name: string; email: string | null } } };
}
export interface FinanceSummary {
  paidOrders: number;
  gross: number;
  refunded: number;
  refundCount: number;
  net: number;
  discountsGiven: number;
  ordersByStatus: Record<string, number>;
}

/** Languages stored next to the uz base. A field left empty falls back to uz on the public site. */
export type CmsExtraLanguage = "uz_cyrl" | "ru";
export type CmsTranslations<F extends string> = Partial<Record<CmsExtraLanguage, Partial<Record<F, string>> | null>>;
export interface CmsPage { id: string; slug: string; title: string; content: string; seoTitle: string | null; seoDescription: string | null; status: "DRAFT" | "PUBLISHED"; updatedAt: string; translations?: CmsTranslations<"title" | "content" | "seoTitle" | "seoDescription"> }
export interface CmsNews { id: string; slug: string; title: string; summary: string | null; content: string; coverUrl: string | null; seoTitle?: string | null; seoDescription?: string | null; status: "DRAFT" | "PUBLISHED"; publishedAt: string | null; translations?: CmsTranslations<"title" | "summary" | "content" | "seoTitle" | "seoDescription"> }
export interface CmsFaq { id: string; question: string; answer: string; order: number; isPublished: boolean; translations?: CmsTranslations<"question" | "answer"> }
export type NotificationTemplateKey = "PAYMENT_PAID" | "ATTENDANCE_ABSENT" | "SCHEDULE_NEW" | "SCHEDULE_CHANGED" | "SCHEDULE_CANCELLED" | "TEST_PASSED" | "TEST_FAILED" | "ANNOUNCEMENT";
export interface NotificationTemplateText { subject: string; body: string; custom: boolean; updatedAt: string | null; builtin: { subject: string; body: string } }
export interface NotificationTemplate { key: NotificationTemplateKey; placeholders: string[]; required: string[]; languages: Record<"uz" | "uz_cyrl" | "ru", NotificationTemplateText> }
export interface ContactMessage { id: string; name: string; contact: string; message: string; status: "NEW" | "READ" | "ARCHIVED"; createdAt: string }

export interface TestConfig { courseId: string; questionCount: number; durationSeconds: number | null; passScore: number; maxAttempts: number | null; maxMistakes: number | null }

/* ───────── public & student ───────── */

export const shopService = {
  packages: () => apiGet<PublicPackage[]>("/packages"),
  quote: (packageId: string, couponCode?: string) => apiPost<Quote>("/quote", { packageId, couponCode: couponCode || undefined }),
  createOrder: (packageId: string, couponCode?: string) => apiPost<Order>("/orders", { packageId, couponCode: couponCode || undefined }),
  orders: () => apiGet<Order[]>("/orders"),
  order: (id: string) => apiGet<Order>(`/orders/${id}`),
};

export interface PracticeSummary { mistakes: number; saved: number; savedIds: string[] }

export const studentService = {
  enrollments: () => apiGet<Enrollment[]>("/me/enrollments"),
  /** Courses the student may open now (bought and active); `all` for staff or when the paywall is off. */
  courseAccess: () => apiGet<{ all: boolean; courseIds: string[] }>("/me/course-access"),
  /** Practice lists: questions last answered wrong and bookmarked questions. */
  practice: () => apiGet<PracticeSummary>("/me/practice"),
  saveQuestion: (questionId: string) => apiPut<{ saved: boolean }>(`/me/saved-questions/${questionId}`),
  unsaveQuestion: (questionId: string) => apiDelete<{ saved: boolean }>(`/me/saved-questions/${questionId}`),
  notifications: () => apiGet<{ items: AppNotification[]; unread: number }>("/me/notifications"),
  preferences: () => apiGet<NotificationPrefs>("/me/notification-preferences"),
  savePreferences: (d: Partial<NotificationPrefs>) => apiPut<NotificationPrefs>("/me/notification-preferences", d),
  markRead: (id: string) => apiPost<{ id: string }>(`/me/notifications/${id}/read`),
  markAllRead: () => apiPost<{ updated: number }>("/me/notifications/read-all"),
  schedule: (from: string, to: string) => apiGet<ScheduleItem[]>("/me/schedule", { from, to }),
  attendance: () => apiGet<MyAttendance>("/me/attendance"),
  /** The student's groups: name, course, rhythm (juft/toq kunlar) and usual lesson time. */
  groups: () => apiGet<MyGroup[]>("/me/groups"),
  /** Seconds spent on a lesson or test page since the previous report (the server credits real time only). */
  reportStudyTime: (kind: "lesson" | "test", seconds: number) => apiPost<{ credited: number }>("/me/study-time", { kind, seconds }),
  studyWeek: () => apiGet<StudyWeek>("/me/study-time/week"),
};

/* ───────── teacher ───────── */

export const teacherService = {
  groups: () => apiGet<Group[]>("/groups"),
  /** A teacher opens a group for themselves; the lessons follow from days + startTime. */
  createGroup: (d: GroupInput) => apiPost<Group & { lessonsCreated: number }>("/groups", d),
  updateGroup: (id: string, d: Partial<GroupInput>) => apiPut<Group & { lessonsCreated: number }>(`/groups/${id}`, d),
  addMember: (id: string, studentId: string) => apiPost<unknown>(`/groups/${id}/members`, { studentId }),
  removeMember: (id: string, studentId: string) => apiDelete<unknown>(`/groups/${id}/members/${studentId}`),
  searchStudents: (search: string) => apiGet<StudentHit[]>("/teacher/students", { search }),
  group: (id: string) => apiGet<GroupDetail>(`/groups/${id}`),
  slots: (id: string) => apiGet<Slot[]>(`/groups/${id}/slots`),
  roster: (slotId: string) => apiGet<Roster>(`/slots/${slotId}/attendance`),
  mark: (slotId: string, records: { studentId: string; status: AttendanceStatus; note?: string | null }[], reason?: string) =>
    apiPut<unknown>(`/slots/${slotId}/attendance`, { records, reason: reason || undefined }),
  finalize: (slotId: string) => apiPost<unknown>(`/slots/${slotId}/attendance/finalize`),
  updateSlot: (slotId: string, data: { topic?: string | null; status?: Slot["status"] }) => apiPatch<Slot>(`/slots/${slotId}`, data),
  report: (id: string) => apiGet<{ lessons: number; rows: (AttendanceSummary & { studentId: string; name: string })[] }>(`/groups/${id}/attendance-report`),
  /** Downloads the CSV through the authenticated client (a plain link could not send the token). */
  downloadCsv: async (id: string) => {
    const res = await apiClient.get<Blob>(`/groups/${id}/attendance-report.csv`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance.csv";
    a.click();
    URL.revokeObjectURL(url);
  },
};

/* ───────── admin ───────── */

export const adminPlatformService = {
  // catalog
  packages: () => apiGet<AdminPackage[]>("/admin/catalog/packages"),
  createPackage: (d: { courseId: string; name: string; description?: string | null; durationDays?: number | null }) => apiPost<AdminPackage>("/admin/catalog/packages", d),
  updatePackage: (id: string, d: Partial<{ name: string; description: string | null; durationDays: number | null; isActive: boolean }>) => apiPut<AdminPackage>(`/admin/catalog/packages/${id}`, d),
  archivePackage: (id: string) => apiDelete<unknown>(`/admin/catalog/packages/${id}`),
  setPrice: (id: string, d: { amount: number; isSample?: boolean }) => apiPost<unknown>(`/admin/catalog/packages/${id}/prices`, { currency: "UZS", ...d }),
  discounts: () => apiGet<Discount[]>("/admin/catalog/discounts"),
  createDiscount: (d: { name: string; type: "PERCENT" | "FIXED"; value: number; packageId?: string | null }) => apiPost<Discount>("/admin/catalog/discounts", d),
  toggleDiscount: (id: string, isActive: boolean) => apiPatch<Discount>(`/admin/catalog/discounts/${id}`, { isActive }),
  coupons: () => apiGet<Coupon[]>("/admin/catalog/coupons"),
  createCoupon: (d: { code: string; type: "PERCENT" | "FIXED"; value: number; maxRedemptions?: number | null; minOrderAmount?: number }) => apiPost<Coupon>("/admin/catalog/coupons", d),
  toggleCoupon: (id: string, isActive: boolean) => apiPatch<Coupon>(`/admin/catalog/coupons/${id}`, { isActive }),

  // finance
  orders: (params: { page?: number; status?: string; search?: string }) => apiGetPage<AdminOrder>("/admin/finance/orders", params),
  refunds: () => apiGet<RefundRow[]>("/admin/finance/refunds"),
  createRefund: (paymentId: string, amount: number, reason: string) => apiPost<RefundRow>(`/admin/finance/payments/${paymentId}/refunds`, { amount, reason }),
  completeRefund: (id: string) => apiPost<unknown>(`/admin/finance/refunds/${id}/complete`),
  rejectRefund: (id: string, reason: string) => apiPost<unknown>(`/admin/finance/refunds/${id}/reject`, { reason }),
  financeSummary: (from?: string, to?: string) => apiGet<FinanceSummary>("/admin/finance/summary", { from, to }),

  // groups
  groups: () => apiGet<Group[]>("/groups"),
  createGroup: (d: GroupInput) => apiPost<Group & { lessonsCreated: number }>("/admin/groups", d),
  updateGroup: (id: string, d: Partial<GroupInput>) => apiPut<Group & { lessonsCreated: number }>(`/admin/groups/${id}`, d),
  archiveGroup: (id: string) => apiDelete<unknown>(`/admin/groups/${id}`),
  addMember: (id: string, studentId: string) => apiPost<unknown>(`/admin/groups/${id}/members`, { studentId }),
  removeMember: (id: string, studentId: string) => apiDelete<unknown>(`/admin/groups/${id}/members/${studentId}`),
  createSlots: (id: string, d: { startsAt: string; endsAt: string; room?: string | null; onlineUrl?: string | null; topic?: string | null; repeat?: { everyWeeks: number; count: number } }) =>
    apiPost<Slot[]>(`/admin/groups/${id}/slots`, d),

  // cms
  pages: () => apiGet<CmsPage[]>("/admin/cms/pages"),
  savePage: (id: string | null, d: Partial<CmsPage>) => (id ? apiPut<CmsPage>(`/admin/cms/pages/${id}`, d) : apiPost<CmsPage>("/admin/cms/pages", d)),
  news: () => apiGet<CmsNews[]>("/admin/cms/news"),
  saveNews: (id: string | null, d: Partial<CmsNews>) => (id ? apiPut<CmsNews>(`/admin/cms/news/${id}`, d) : apiPost<CmsNews>("/admin/cms/news", d)),
  faq: () => apiGet<CmsFaq[]>("/admin/cms/faq"),
  saveFaq: (id: string | null, d: Partial<CmsFaq>) => (id ? apiPut<CmsFaq>(`/admin/cms/faq/${id}`, d) : apiPost<CmsFaq>("/admin/cms/faq", d)),
  deleteFaq: (id: string) => apiDelete<unknown>(`/admin/cms/faq/${id}`),
  messages: () => apiGet<ContactMessage[]>("/admin/cms/messages"),
  setMessageStatus: (id: string, status: ContactMessage["status"]) => apiPatch<unknown>(`/admin/cms/messages/${id}`, { status }),
  settings: () => apiGet<Record<string, unknown> & { translations?: CmsTranslations<string> }>("/admin/cms/site-settings"),
  saveSettings: (d: Record<string, unknown>) => apiPut<Record<string, unknown>>("/admin/cms/site-settings", d),

  notificationTemplates: () => apiGet<NotificationTemplate[]>("/admin/cms/notification-templates"),
  saveNotificationTemplate: (key: NotificationTemplateKey, language: string, d: { subject: string; body: string }) => apiPut<unknown>(`/admin/cms/notification-templates/${key}/${language}`, d),
  resetNotificationTemplate: (key: NotificationTemplateKey, language: string) => apiDelete<unknown>(`/admin/cms/notification-templates/${key}/${language}`),
  announce: (d: { title: string; body: string; audience: { type: "all" } | { type: "group"; groupId: string } | { type: "course"; courseId: string } }) =>
    apiPost<{ recipients: number; emailsQueued: number; emailConfigured: boolean }>("/admin/cms/announcements", d),

  // exam
  testConfig: (courseId: string) => apiGet<TestConfig | null>(`/admin/exam/courses/${courseId}/config`),
  saveTestConfig: (courseId: string, d: Omit<TestConfig, "courseId">) => apiPut<TestConfig>(`/admin/exam/courses/${courseId}/config`, d),
  importQuestions: (questions: unknown[]) => apiPost<{ imported: number }>("/admin/exam/questions/import", { questions }),
  exportQuestions: (courseId?: string) => apiGet<{ questions: unknown[] }>("/admin/exam/questions/export", { courseId }),
};

/* ───────── private media ───────── */

export interface MediaConfig { uploadEnabled: boolean; maxVideoMb: number; maxFileMb: number }
export interface MediaVideo { id: string; lessonId: string | null; title: string | null; mimeType: string; sizeBytes: number; isArchived: boolean; createdAt: string }
export interface MediaFile { id: string; courseId: string | null; filename: string; mimeType: string; sizeBytes: number; isPublic: boolean; createdAt: string }

export const mediaService = {
  config: () => apiGet<MediaConfig>("/admin/media/config"),
  list: () => apiGet<{ videos: MediaVideo[]; files: MediaFile[] }>("/admin/media"),
  archiveVideo: (id: string) => apiDelete<unknown>(`/admin/media/video/${id}`),
  /** Raw body upload (the file itself), with progress. The server sniffs the real type from the bytes. */
  upload: async (kind: "video" | "file", file: File, meta: { lessonId?: string; courseId?: string; title?: string }, onProgress?: (pct: number) => void) => {
    const res = await apiClient.put<{ data: unknown }>(`/admin/media/${kind}`, file, {
      params: { ...meta, filename: kind === "file" ? file.name : undefined },
      headers: { "Content-Type": "application/octet-stream" },
      timeout: 0,
      onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
    });
    return res.data.data;
  },
  /** Short-lived stream URL for a video the viewer is entitled to; absolute, ready for <video src>. */
  streamUrl: async (kind: "video" | "file", id: string): Promise<string> => {
    const r = await apiPost<{ url: string }>(`/media/${kind}/${id}/access`);
    return new URL(r.url, apiClient.defaults.baseURL).toString();
  },
};

/* ───────── CMS image library (public images) ───────── */

export interface CmsImage { id: string; filename: string; mimeType: string; sizeBytes: number; createdAt?: string; path: string; url: string }

export const imageService = {
  config: () => apiGet<{ maxImageMb: number }>("/admin/cms/images/config"),
  list: () => apiGet<CmsImage[]>("/admin/cms/images"),
  remove: (id: string) => apiDelete<unknown>(`/admin/cms/images/${id}`),
  /** Raw body upload; the server checks the real type (PNG/JPEG/WebP) and runs the antivirus scan. */
  upload: async (file: File, onProgress?: (pct: number) => void): Promise<CmsImage> => {
    const res = await apiClient.put<{ data: CmsImage }>("/admin/cms/images", file, {
      params: { filename: file.name },
      headers: { "Content-Type": "application/octet-stream" },
      timeout: 0,
      onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
    });
    return res.data.data;
  },
};

/* ───────── course categories ───────── */

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  order: number;
  isActive: boolean;
  courseCount: number;
  translations?: CmsTranslations<"name" | "description">;
}
export type AdminCategoryInput = Partial<Omit<AdminCategory, "id" | "courseCount">>;

export const categoryService = {
  list: () => apiGet<AdminCategory[]>("/admin/categories"),
  save: (id: string | null, d: AdminCategoryInput) => (id ? apiPut<AdminCategory>(`/admin/categories/${id}`, d) : apiPost<AdminCategory>("/admin/categories", d)),
  remove: (id: string) => apiDelete<unknown>(`/admin/categories/${id}`),
};

/* ───────── reports & system status ───────── */

export interface TestReportRow { courseId: string | null; course: string | null; attempts: number; students: number; passed: number; passRate: number; averageScore: number; averageSeconds: number }
export interface TestReport { total: { attempts: number; students: number; passed: number; passRate: number; averageScore: number }; rows: TestReportRow[] }
export interface TeacherLoadRow { teacherId: string; name: string; activeGroups: number; students: number; lessons: number; planned: number; done: number; cancelled: number; hours: number; attendanceMissing: number }
export type CheckLevel = "ok" | "warning" | "error";
export interface SystemCheck { key: "database" | "payments" | "email" | "telegram" | "media" | "antivirus" | "enrollment" | "rateLimit" | "monitoring"; level: CheckLevel; detail?: Record<string, unknown> }
export interface SystemStatus { environment: string; nodeVersion: string; uptimeSeconds: number; checkedAt: string; checks: SystemCheck[] }

export const reportService = {
  tests: (from: string, to: string, courseId?: string) => apiGet<TestReport>("/admin/reports/tests", { from, to, courseId }),
  teachers: (from: string, to: string) => apiGet<{ rows: TeacherLoadRow[] }>("/admin/reports/teachers", { from, to }),
  system: () => apiGet<SystemStatus>("/admin/system"),
};

/** Window event with the current unread-notification count (detail: number), sent by the notifications page. */
export const UNREAD_EVENT = "eavto:unread-notifications";
