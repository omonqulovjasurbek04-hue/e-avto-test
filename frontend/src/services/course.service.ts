import { apiGet } from "./api";
import { env } from "../config/env";
import type { Course, Difficulty } from "../types/course";
import type { Lesson } from "../types/lesson";
import { contentLanguage } from "./site.service";

export interface CourseFilters {
  search?: string;
  category?: string;
  difficulty?: string;
  sort?: string;
}

interface ApiCourse {
  id: string;
  title: string;
  description: string;
  thumbnail?: string | null;
  level?: string;
  order?: number;
  isPublished?: boolean;
  lessonCount?: number;
  createdAt?: string;
  updatedAt?: string;
  lessons?: ApiLesson[];
  category?: { id: string; slug: string; name: string } | null;
}

export interface PublicCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  order: number;
  courseCount: number;
}

export interface ApiLesson {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  content?: string | null;
  thumbnail?: string | null;
  videoUrl?: string | null;
  locked?: boolean;
  privateVideoId?: string | null;
  duration?: number;
  order: number;
  category?: string;
  questionCount?: number;
}

const LEVEL_TO_DIFFICULTY: Record<string, Difficulty> = {
  "Boshlang'ich": "beginner",
  "O'rta": "intermediate",
  Murakkab: "advanced",
};

/** API lesson durations are in seconds; the UI works in minutes. */
export function toLesson(l: ApiLesson): Lesson {
  return {
    id: l.id,
    courseId: l.courseId,
    title: l.title,
    description: l.description ?? undefined,
    content: l.content ?? undefined,
    thumbnail: l.thumbnail ?? undefined,
    videoUrl: l.videoUrl || undefined,
    locked: l.locked ?? false,
    privateVideoId: l.privateVideoId ?? null,
    duration: undefined,
    durationMinutes: Math.max(1, Math.round((l.duration ?? 0) / 60)),
    order: l.order,
    category: l.category,
    questionCount: l.questionCount,
  };
}

function toCourse(c: ApiCourse): Course {
  const lessons = c.lessons?.map(toLesson);
  const totalSeconds = c.lessons?.reduce((sum, l) => sum + (l.duration ?? 0), 0) ?? 0;
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category?.name ?? "",
    categorySlug: c.category?.slug,
    difficulty: c.level ? LEVEL_TO_DIFFICULTY[c.level] : undefined,
    thumbnail: c.thumbnail ?? undefined,
    lessonsCount: c.lessonCount ?? lessons?.length ?? 0,
    totalLessons: c.lessonCount ?? lessons?.length ?? 0,
    totalDurationMinutes: Math.round(totalSeconds / 60),
    order: c.order,
    isPublished: c.isPublished,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function applyFilters(list: Course[], filters?: CourseFilters): Course[] {
  let result = [...list];
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }
  if (filters?.difficulty && filters.difficulty !== "all") {
    result = result.filter((c) => c.difficulty === filters.difficulty);
  }
  if (filters?.sort === "newest") {
    result.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  } else if (filters?.sort === "title") {
    result.sort((a, b) => a.title.localeCompare(b.title));
  }
  return result;
}

export const courseService = {
  async getCourses(filters?: CourseFilters): Promise<Course[]> {
    if (env.useMock) return applyFilters((await import("../data/mockCourses")).mockCourses, filters);
    // The category filter runs on the server (?category=<slug>); search/difficulty/sort stay client-side.
    const params: Record<string, string> = { lang: contentLanguage() };
    if (filters?.category && filters.category !== "all") params.category = filters.category;
    const courses = await apiGet<ApiCourse[]>("/courses", params);
    return applyFilters(courses.map(toCourse), filters);
  },

  async getCategories(): Promise<PublicCategory[]> {
    if (env.useMock) return [];
    return apiGet<PublicCategory[]>("/categories", { lang: contentLanguage() });
  },

  async getCourse(id: string): Promise<Course | null> {
    if (env.useMock) return (await import("../data/mockCourses")).mockCourses.find((c) => c.id === id) ?? null;
    return toCourse(await apiGet<ApiCourse>(`/courses/${id}`));
  },

  async getLessons(courseId: string): Promise<Lesson[]> {
    if (env.useMock) return (await import("../data/mockLessons")).mockLessons.filter((l) => l.courseId === courseId);
    return (await apiGet<ApiLesson[]>(`/courses/${courseId}/lessons`)).map(toLesson);
  },
};
