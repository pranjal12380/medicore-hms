import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError } from "@/lib/rbac";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function paginated<T>(
  data: T[],
  meta: { page: number; pageSize: number; total: number }
) {
  return NextResponse.json({
    success: true,
    data,
    meta: { ...meta, totalPages: Math.max(1, Math.ceil(meta.total / meta.pageSize)) },
  });
}

/**
 * Central error -> HTTP mapping so every route handler can just
 * `catch (e) { return handleApiError(e) }`
 */
export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { success: false, error: "Validation failed", issues: error.flatten() },
      { status: 422 }
    );
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  }
  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "NOT_FOUND") {
    return NextResponse.json({ success: false, error: "Resource not found" }, { status: 404 });
  }

  console.error("[API_ERROR]", error);
  return NextResponse.json(
    { success: false, error: "Internal server error" },
    { status: 500 }
  );
}
