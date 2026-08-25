import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { StudentLayout } from "@/layouts/StudentLayout";
import ProtectedRoute from "./ProtectedRoute";
import { FullSpinner } from "@/components/ui/Spinner";
import { ROUTES } from "@/constants/routes";

const Home = lazy(() => import("@/pages/public/Home"));
const Courses = lazy(() => import("@/pages/public/Courses"));
const CourseDetails = lazy(() => import("@/pages/public/CourseDetails"));
const About = lazy(() => import("@/pages/public/About"));
const Contact = lazy(() => import("@/pages/public/Contact"));
const Faq = lazy(() => import("@/pages/public/Faq"));

const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));

const Dashboard = lazy(() => import("@/pages/student/Dashboard"));
const Lessons = lazy(() => import("@/pages/student/Lessons"));
const LessonDetails = lazy(() => import("@/pages/student/LessonDetails"));
const VideoLesson = lazy(() => import("@/pages/student/VideoLesson"));
const Tests = lazy(() => import("@/pages/student/Tests"));
const TestPage = lazy(() => import("@/pages/student/TestPage"));
const TestResult = lazy(() => import("@/pages/student/TestResult"));
const TestReview = lazy(() => import("@/pages/student/TestReview"));
const History = lazy(() => import("@/pages/student/History"));
const Progress = lazy(() => import("@/pages/student/Progress"));
const Leaderboard = lazy(() => import("@/pages/student/Leaderboard"));
const Profile = lazy(() => import("@/pages/student/Profile"));
const Settings = lazy(() => import("@/pages/student/Settings"));

const NotFound = lazy(() => import("@/pages/errors/NotFound"));
const Forbidden = lazy(() => import("@/pages/errors/Forbidden"));
const ServerError = lazy(() => import("@/pages/errors/ServerError"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<FullSpinner />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path={ROUTES.home} element={<Home />} />
          <Route path={ROUTES.courses} element={<Courses />} />
          <Route path="/courses/:courseId" element={<CourseDetails />} />
          <Route path={ROUTES.about} element={<About />} />
          <Route path={ROUTES.contact} element={<Contact />} />
          <Route path={ROUTES.faq} element={<Faq />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path={ROUTES.login} element={<Login />} />
          <Route path={ROUTES.register} element={<Register />} />
          <Route path={ROUTES.forgotPassword} element={<ForgotPassword />} />
          <Route path={ROUTES.resetPassword} element={<ResetPassword />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<StudentLayout />}>
            <Route path={ROUTES.dashboard} element={<Dashboard />} />
            <Route path={ROUTES.lessons} element={<Lessons />} />
            <Route path="/lessons/:lessonId" element={<LessonDetails />} />
            <Route path="/lessons/:lessonId/video" element={<VideoLesson />} />
            <Route path={ROUTES.tests} element={<Tests />} />
            <Route path="/tests/:testId" element={<TestPage />} />
            <Route path="/tests/:testId/result" element={<TestResult />} />
            <Route path="/tests/:testId/review" element={<TestReview />} />
            <Route path={ROUTES.history} element={<History />} />
            <Route path={ROUTES.progress} element={<Progress />} />
            <Route path={ROUTES.leaderboard} element={<Leaderboard />} />
            <Route path={ROUTES.profile} element={<Profile />} />
            <Route path={ROUTES.settings} element={<Settings />} />
          </Route>
        </Route>

        <Route path="/403" element={<Forbidden />} />
        <Route path="/500" element={<ServerError />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
