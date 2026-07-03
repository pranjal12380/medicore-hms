import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

/**
 * Path-prefix -> roles allowed. First match wins.
 * Anything under /api/* is additionally re-checked inside the route handler
 * via assertCan() since middleware can't see the specific resource/action.
 */
const ROUTE_RULES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/dashboard/billing", roles: ["SUPER_ADMIN", "HOSPITAL_ADMIN", "ACCOUNTANT"] },
  { prefix: "/dashboard/pharmacy", roles: ["SUPER_ADMIN", "HOSPITAL_ADMIN", "PHARMACIST"] },
  { prefix: "/dashboard/lab", roles: ["SUPER_ADMIN", "HOSPITAL_ADMIN", "LAB_TECHNICIAN", "DOCTOR"] },
  { prefix: "/dashboard/staff", roles: ["SUPER_ADMIN", "HOSPITAL_ADMIN"] },
  { prefix: "/dashboard/audit-logs", roles: ["SUPER_ADMIN", "HOSPITAL_ADMIN"] },
  { prefix: "/dashboard", roles: [
    "SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE",
    "RECEPTIONIST", "LAB_TECHNICIAN", "PHARMACIST", "ACCOUNTANT", "PATIENT",
  ] },
];

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p) || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const session = req.auth;
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = (session.user as any).role as Role;
  const rule = ROUTE_RULES.find((r) => pathname.startsWith(r.prefix));
  if (rule && !rule.roles.includes(role)) {
    return NextResponse.redirect(new URL("/dashboard?error=forbidden", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
