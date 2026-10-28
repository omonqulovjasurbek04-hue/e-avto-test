import { lazy, Suspense } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import { PanelRedirect, SiteLayout } from "./SiteLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { StudentLayout } from "@/layouts/StudentLayout";
import ProtectedRoute from "./ProtectedRoute";
import GuestRoute from "./GuestRoute";
import RequireCourse from "./RequireCourse";
import CourseLinkRoute from "./CourseLinkRoute";
import { RequirePerm } from "./RequirePerm";
import OldAdminRedirect from "./OldAdminRedirect";
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
const GoogleCallback = lazy(() => import("@/pages/auth/GoogleCallback"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));

const Dashboard = lazy(() => import("@/pages/student/Dashboard"));
const Lessons = lazy(() => import("@/pages/student/Lessons"));
const LessonDetails = lazy(() => import("@/pages/student/LessonDetails"));
const VideoLesson = lazy(() => import("@/pages/student/VideoLesson"));
const Tests = lazy(() => import("@/pages/student/Tests"));
const Mistakes = lazy(() => import("@/pages/student/Mistakes"));
const TestPage = lazy(() => import("@/pages/student/TestPage"));
const TestResult = lazy(() => import("@/pages/student/TestResult"));
const TestReview = lazy(() => import("@/pages/student/TestReview"));
const Leaderboard = lazy(() => import("@/pages/public/Leaderboard"));
const Profile = lazy(() => import("@/pages/student/Profile"));
const Orders = lazy(() => import("@/pages/student/Orders"));
const Notifications = lazy(() => import("@/pages/student/Notifications"));
const TeacherGroups = lazy(() => import("@/pages/teacher/TeacherGroups"));
const TeacherGroupDetail = lazy(() => import("@/pages/teacher/TeacherGroupDetail"));
const TicketEditor = lazy(() => import("@/pages/teacher/TicketEditor"));
const StudentKnowledge = lazy(() => import("@/pages/teacher/StudentKnowledge"));
const Settings = lazy(() => import("@/pages/student/Settings"));

const AdminOrders = lazy(() => import("@/pages/admin/AdminOrders"));
const AdminCms = lazy(() => import("@/pages/admin/AdminCms"));
const AdminExam = lazy(() => import("@/pages/admin/AdminExam"));
const AdminAudit = lazy(() => import("@/pages/admin/AdminAudit"));
const AdminSystem = lazy(() => import("@/pages/admin/AdminSystem"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));

const NotFound = lazy(() => import("@/pages/errors/NotFound"));
const Forbidden = lazy(() => import("@/pages/errors/Forbidden"));
const ServerError = lazy(() => import("@/pages/errors/ServerError"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<FullSpinner />}>
      <Routes>
        {/* Public pages: guests see the site's top menu, signed-in users the same page inside the app. */}
        <Route element={<SiteLayout />}>
          {/* The landing page is for guests: a signed-in user opening the site goes to the dashboard. */}
          <Route element={<GuestRoute />}>
            <Route path={ROUTES.home} element={<Home />} />
          </Route>
          {/* The catalogue and the ranking have their own place in the app: signed-in users go there. */}
          <Route element={<PanelRedirect to="/my-courses" />}>
            <Route path={ROUTES.courses} element={<Courses />} />
          </Route>
          <Route path="/courses/:courseId" element={<CourseLinkRoute />} />
          <Route path={ROUTES.about} element={<About />} />
          <Route path={ROUTES.contact} element={<Contact />} />
          <Route path={ROUTES.faq} element={<Faq />} />
          {/* Public: guests see the ranking too; a signed-in student also sees their own place. */}
          <Route element={<PanelRedirect to="/my-rating" />}>
            <Route path={ROUTES.leaderboard} element={<Leaderboard />} />
          </Route>
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
            <Route path="/mistakes" element={<RequireCourse staffPerm="groups:manage"><Mistakes /></RequireCourse>} />
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
            <Route path="/tests/manage/:ticket" element={<RequirePerm perm="tickets:edit"><TicketEditor /></RequirePerm>} />
            <Route path="/users" element={<RequirePerm perm="users:manage"><AdminUsers /></RequirePerm>} />
            {/* Staff tools inside the app (they used to be admin panel pages). */}
            {/* The question bank lives in the Tests page now (Biletlar | Savollar banki). */}
            <Route path="/question-bank" element={<Navigate to="/tests" replace />} />
            <Route path="/site-content" element={<RequirePerm perm="content:manage"><div className="container-page py-8"><AdminCms /></div></RequirePerm>} />
            <Route path="/revenue" element={<RequirePerm perm="orders:read"><div className="container-page py-8"><AdminOrders /></div></RequirePerm>} />
            <Route path="/audit" element={<RequirePerm perm="audit:read"><div className="container-page py-8"><AdminAudit /></div></RequirePerm>} />
            <Route path="/exam-settings" element={<RequirePerm perm="tests:manage"><div className="container-page py-8"><AdminExam /></div></RequirePerm>} />
            <Route path="/system" element={<RequirePerm perm="settings:manage"><div className="container-page py-8"><AdminSystem /></div></RequirePerm>} />
            <Route path="/mistakes/student" element={<TeacherRoute><StudentKnowledge /></TeacherRoute>} />
          </Route>
        </Route>

        {/* The old admin panel: its pages live in the app now; old addresses forward there. */}
        <Route path="/admin/*" element={<OldAdminRedirect />} />

        {/* Google sign-in returns here (signed in or with a 2FA challenge), outside the guest/protected guards. */}
        <Route path="/auth/google" element={<GoogleCallback />} />
        <Route path="/403" element={<Forbidden />} />
        <Route path="/500" element={<ServerError />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
