import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { can, type Permission } from "@/lib/permissions";

// First page each staff role is allowed to open, in priority order.
// Only the exam settings are left in the panel; everything else lives in the app.
const LANDING: [Permission, string][] = [
  ["tests:manage", "/admin/exam"],
  ["groups:manage", "/teacher"],
  ["orders:read", "/revenue"],
  ["content:manage", "/site-content"],
];

/** /admin: the role's own first page (the statistics are on the admin's start page in the main site). */
export default function AdminHome() {
  const role = useAuthStore((s) => s.user?.role);
  const target = LANDING.find(([perm]) => can(role, perm));
  return <Navigate to={target ? target[1] : "/403"} replace />;
}
