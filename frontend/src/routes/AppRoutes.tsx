import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { StudentLayout } from "@/layouts/StudentLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import ProtectedRoute from "./ProtectedRoute";
import GuestRoute from "./GuestRoute";
import RequireCourse from "./RequireCourse";
import CourseLinkRoute from "./CourseLinkRoute";
import { AdminRoute, RequirePerm } from "./AdminRoute";
import { TeacherRoute } from "./TeacherRoute";
import { FullSpinner } from "@/components/ui/Spinner";
import { ROUTES } from "@/constants/routes";

const Home = lazy(() => import("@/pages/public/Home"));
const Courses = lazy(() => import("@/pages/public/Courses"));
const Guide = lazy(() => import("@/pages/student/Guide"));
const CourseDetails = lazy(() => import("@/pages/public/CourseDetails"));
const About = lazy(() => import("@/pages/public/About"));
const Contact = lazy(() => import("@/pages/public/Contact"));
const Legal = lazy(() => import("@/pages/public/Legal"));
const Pricing = lazy(() => import("@/pages/public/Pricing"));
const News = lazy(() => import("@/pages/public/News"));
const NewsDetail = lazy(() => import("@/pages/public/NewsDetail"));
const CmsPage = lazy(() => import("@/pages/public/CmsPage"));
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
const Leaderboard = lazy(() => import("@/pages/public/Leaderboard"));
const Profile = lazy(() => import("@/pages/student/Profile"));
const Orders = lazy(() => import("@/pages/student/Orders"));
const Notifications = lazy(() => import("@/pages/student/Notifications"));
const TeacherGroups = lazy(() => import("@/pages/teacher/TeacherGroups"));
const TeacherGroupDetail = lazy(() => import("@/pages/teacher/TeacherGroupDetail"));
const Settings = lazy(() => import("@/pages/student/Settings"));

const AdminCourses = lazy(() => import("@/pages/admin/AdminCourses"));
const AdminCategories = lazy(() => import("@/pages/admin/AdminCategories"));
const AdminQuestions = lazy(() => import("@/pages/admin/AdminQuestions"));
const AdminLessons = lazy(() => import("@/pages/admin/AdminLessons"));
const AdminCatalog = lazy(() => import("@/pages/admin/AdminCatalog"));
const AdminOrders = lazy(() => import("@/pages/admin/AdminOrders"));
const AdminGroups = lazy(() => import("@/pages/admin/AdminGroups"));
const AdminCms = lazy(() => import("@/pages/admin/AdminCms"));
const AdminExam = lazy(() => import("@/pages/admin/AdminExam"));
const AdminMedia = lazy(() => import("@/pages/admin/AdminMedia"));
const AdminAudit = lazy(() => import("@/pages/admin/AdminAudit"));
const AdminReports = lazy(() => import("@/pages/admin/AdminReports"));
const AdminSystem = lazy(() => import("@/pages/admin/AdminSystem"));
const AdminHome = lazy(() => import("@/pages/admin/AdminHome"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));

const NotFound = lazy(() => import("@/pages/errors/NotFound"));
const Forbidden = lazy(() => import("@/pages/errors/Forbidden"));
const ServerError = lazy(() => import("@/pages/errors/ServerError"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<FullSpinner />}>
      <Routes>
        <Route element={<MainLayout />}>
          {/* The landing page is for guests: a signed-in user opening the site goes to the dashboard. */}
          <Route element={<GuestRoute />}>
            <Route path={ROUTES.home} element={<Home />} />
          </Route>
          <Route path={ROUTES.courses} element={<Courses />} />
          <Route path="/courses/:courseId" element={<CourseLinkRoute />} />
          <Route path={ROUTES.about} element={<About />} />
          <Route path={ROUTES.contact} element={<Contact />} />
          <Route path={ROUTES.faq} element={<Faq />} />
          {/* Public: guests see the ranking too; a signed-in student also sees their own place. */}
          <Route path={ROUTES.leaderboard} element={<Leaderboard />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:slug" element={<NewsDetail />} />
          <Route path="/p/:slug" element={<CmsPage />} />
          <Route path="/privacy" element={<Legal />} />
          <Route path="/terms" element={<Legal />} />
        </Route>

        <Route element={<AuthLayout />}>
          {/* Signed-in users skip these and land on the dashboard. */}
          <Route element={<GuestRoute />}>
            <Route path={ROUTES.login} element={<Login />} />
            <Route path={ROUTES.forgotPassword} element={<ForgotPassword />} />
          </Route>
          {/* Register checks the session itself: a Telegram sign-up without a password finishes step 2 here. */}
          <Route path={ROUTES.register} element={<Register />} />
          <Route path={ROUTES.resetPassword} element={<ResetPassword />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<StudentLayout />}>
            <Route path={ROUTES.dashboard} element={<Dashboard />} />
            <Route path="/guide/:slug" element={<Guide />} />
            {/* The course catalogue inside the student panel (same page as the public /courses). */}
            <Route path="/my-courses" element={<Courses />} />
            <Route path="/my-courses/:courseId" element={<CourseDetails />} />
            {/* Lessons and tests need a bought course; without one the student lands on the catalogue. */}
            <Route path={ROUTES.lessons} element={<RequireCourse><Lessons /></RequireCourse>} />
            <Route path="/lessons/:lessonId" element={<RequireCourse><LessonDetails /></RequireCourse>} />
            <Route path="/lessons/:lessonId/video" element={<RequireCourse><VideoLesson /></RequireCourse>} />
            <Route path={ROUTES.tests} element={<RequireCourse><Tests /></RequireCourse>} />
            <Route path="/tests/:testId" element={<TestPage />} />
            <Route path="/tests/:testId/result" element={<TestResult />} />
            <Route path="/tests/:testId/review" element={<TestReview />} />
            {/* The ranking inside the student panel (same page as the public /leaderboard). */}
            <Route path="/my-rating" element={<Leaderboard />} />
            <Route path={ROUTES.profile} element={<Profile />} />
            <Route path={ROUTES.settings} element={<Settings />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/teacher" element={<TeacherRoute><TeacherGroups /></TeacherRoute>} />
            <Route path="/teacher/groups/:groupId" element={<TeacherRoute><TeacherGroupDetail /></TeacherRoute>} />
          </Route>
        </Route>

        <Route
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/courses" element={<RequirePerm perm="catalog:manage"><AdminCourses /></RequirePerm>} />
          <Route path="/admin/categories" element={<RequirePerm perm="catalog:manage"><AdminCategories /></RequirePerm>} />
          <Route path="/admin/lessons" element={<RequirePerm perm="catalog:manage"><AdminLessons /></RequirePerm>} />
          <Route path="/admin/questions" element={<RequirePerm perm="tests:manage"><AdminQuestions /></RequirePerm>} />
          <Route path="/admin/catalog" element={<RequirePerm perm="catalog:manage"><AdminCatalog /></RequirePerm>} />
          <Route path="/admin/orders" element={<RequirePerm perm="orders:read"><AdminOrders /></RequirePerm>} />
          <Route path="/admin/groups" element={<RequirePerm perm="groups:manage"><AdminGroups /></RequirePerm>} />
          <Route path="/admin/exam" element={<RequirePerm perm="tests:manage"><AdminExam /></RequirePerm>} />
          <Route path="/admin/cms" element={<RequirePerm perm="content:manage"><AdminCms /></RequirePerm>} />
          <Route path="/admin/users" element={<RequirePerm perm="users:manage"><AdminUsers /></RequirePerm>} />
          <Route path="/admin/media" element={<RequirePerm perm="media:manage"><AdminMedia /></RequirePerm>} />
          <Route path="/admin/audit" element={<RequirePerm perm="audit:read"><AdminAudit /></RequirePerm>} />
          <Route path="/admin/reports" element={<RequirePerm perm="reports:read"><AdminReports /></RequirePerm>} />
          <Route path="/admin/system" element={<RequirePerm perm="settings:manage"><AdminSystem /></RequirePerm>} />
        </Route>

        <Route path="/403" element={<Forbidden />} />
        <Route path="/500" element={<ServerError />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
