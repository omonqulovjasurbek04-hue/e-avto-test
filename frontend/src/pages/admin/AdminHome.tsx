import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { can, type Permission } from "@/lib/permissions";
import AdminDashboard from "./AdminDashboard";

// First page each staff role is allowed to open, in priority order.
const LANDING: [Permission, string][] = [
  ["groups:manage", "/admin/groups"],
  ["orders:read", "/admin/orders"],
  ["content:manage", "/admin/cms"],
  ["tests:manage", "/admin/exam"],
];

/** /admin: the statistics dashboard for administrators, otherwise the role's own first page. */
export default function AdminHome() {
  const role = useAuthStore((s) => s.user?.role);
  if (can(role, "users:manage")) return <AdminDashboard />;
  const target = LANDING.find(([perm]) => can(role, perm));
  return <Navigate to={target ? target[1] : "/403"} replace />;
}
