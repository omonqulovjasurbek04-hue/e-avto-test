import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layouts
import { MainLayout } from "../layouts/MainLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { StudentLayout } from "../layouts/StudentLayout";
import { AdminLayout } from "../layouts/AdminLayout";

// Guards
import { ProtectedRoute } from "./ProtectedRoute";
import { AdminRoute } from "./AdminRoute";

// Public Pages
import { HomePage } from "../pages/public/HomePage";
import { CoursesPage } from "../pages/public/CoursesPage";
import { CourseDetailPage } from "../pages/public/CourseDetailPage";
import { AboutPage } from "../pages/public/AboutPage";
import { ContactPage } from "../pages/public/ContactPage";
import { FaqPage } from "../pages/public/FaqPage";

// Auth Pages
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/auth/ResetPasswordPage";

// Student Pages
import { DashboardPage } from "../pages/student/DashboardPage";
import { LessonsPage } from "../pages/student/LessonsPage";
import { LessonDetailPage } from "../pages/student/LessonDetailPage";
import { VideoLessonPage } from "../pages/student/VideoLessonPage";
import { TestsListPage } from "../pages/student/TestsListPage";
import { TestActivePage } from "../pages/student/TestActivePage";
import { TestResultPage } from "../pages/student/TestResultPage";
import { TestReviewPage } from "../pages/student/TestReviewPage";
import { HistoryPage } from "../pages/student/HistoryPage";
import { ProgressPage } from "../pages/student/ProgressPage";
import { LeaderboardPage } from "../pages/student/LeaderboardPage";
import { ProfilePage } from "../pages/student/ProfilePage";

// Admin Pages
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { AdminCoursesPage } from "../pages/admin/AdminCoursesPage";
import { AdminQuestionsPage } from "../pages/admin/AdminQuestionsPage";
import { AdminUsersPage } from "../pages/admin/AdminUsersPage";

// Error Pages
import { NotFoundPage } from "../pages/errors/NotFoundPage";
import { ForbiddenPage } from "../pages/errors/ForbiddenPage";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. Public Routes with MainLayout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Route>

      {/* 2. Auth Routes with AuthLayout */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* 3. Student Cabinet (Protected) */}
      <Route
        element={
          <ProtectedRoute>
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/lessons" element={<LessonsPage />} />
        <Route path="/lessons/:lessonId" element={<LessonDetailPage />} />
        <Route path="/lessons/:lessonId/video" element={<VideoLessonPage />} />
        <Route path="/tests" element={<TestsListPage />} />
        <Route path="/tests/:testId" element={<TestActivePage />} />
        <Route path="/tests/:testId/result" element={<TestResultPage />} />
        <Route path="/tests/:testId/review" element={<TestReviewPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<Navigate to="/profile" replace />} />
      </Route>

      {/* 4. Admin Management (Admin Protected) */}
      <Route
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/courses" element={<AdminCoursesPage />} />
        <Route path="/admin/questions" element={<AdminQuestionsPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
      </Route>

      {/* 5. Error routes */}
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
