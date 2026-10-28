import { Navigate, useLocation } from "react-router-dom";

/**
 * There is no separate admin panel any more: every staff tool lives in the app, each behind its own right.
 * Old /admin addresses (bookmarks, links in messages) land on the page that replaced them.
 */
const MOVED: [RegExp, string][] = [
  [/^\/admin\/(courses|categories|catalog)/, "/my-courses"],
  [/^\/admin\/(lessons|media)/, "/lessons"],
  [/^\/admin\/questions/, "/tests"],
  [/^\/admin\/exam/, "/exam-settings"],
  [/^\/admin\/orders/, "/revenue"],
  [/^\/admin\/groups/, "/teacher"],
  [/^\/admin\/knowledge/, "/mistakes"],
  [/^\/admin\/cms/, "/site-content"],
  [/^\/admin\/users/, "/users"],
  [/^\/admin\/audit/, "/audit"],
  [/^\/admin\/system/, "/system"],
];

export default function OldAdminRedirect() {
  const { pathname } = useLocation();
  const target = MOVED.find(([re]) => re.test(pathname))?.[1] ?? "/dashboard";
  return <Navigate to={target} replace />;
}
