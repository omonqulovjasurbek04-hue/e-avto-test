import { apiClient } from "./api";
import { Course, CreateCoursePayload } from "../types/course";
import { mockCourses } from "../data/mockCourses";
import { mockLessons } from "../data/mockLessons";

export const courseService = {
  async getCourses(): Promise<Course[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Course[] }>("/courses");
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }
    return mockCourses;
  },

  async getCourseById(id: string): Promise<Course | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Course }>(`/courses/${id}`);
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }
    const found = mockCourses.find((c) => c.id === id || c.slug === id);
    if (!found) return null;

    // Attach lessons summaries
    const relatedLessons = mockLessons
      .filter((l) => l.courseId === found.id)
      .map((l) => ({
        id: l.id,
        title: l.title,
        slug: l.slug,
        order: l.order,
        durationMinutes: l.durationMinutes,
        hasVideo: !!l.videoUrl,
        questionCount: l.questionCount || 10,
        isCompleted: false,
      }));

    return {
      ...found,
      lessons: relatedLessons,
    };
  },

  async createCourse(payload: CreateCoursePayload): Promise<Course> {
    try {
      const response = await apiClient.post<{ success: boolean; data: Course }>("/courses", payload);
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }
    const newCourse: Course = {
      id: "course-" + Date.now(),
      title: payload.title,
      slug: payload.slug || payload.title.toLowerCase().replace(/\s+/g, "-"),
      description: payload.description,
      category: (payload.category as any) || "B",
      imageUrl: payload.imageUrl,
      totalLessons: 0,
      totalDurationMinutes: 0,
      isPublished: payload.isPublished ?? true,
      order: payload.order ?? 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return newCourse;
  },
};
