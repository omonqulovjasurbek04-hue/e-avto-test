import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { can, type Permission } from "@/lib/permissions";

// First page each staff role is allowed to open, in priority order.
const LANDING: [Permission, string][] = [
  ["catalog:manage", "/admin/courses"],
  ["groups:manage", "/admin/groups"],
  ["orders:read", "/admin/orders"],
  ["content:manage", "/admin/cms"],
  ["tests:manage", "/admin/exam"],
];

/** /admin: the role's own first page (the statistics are on the admin's start page in the main site). */
export default function AdminHome() {
  const role = useAuthStore((s) => s.user?.role);
  const target = LANDING.find(([perm]) => can(role, perm));
  return <Navigate to={target ? target[1] : "/403"} replace />;
}
