import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCan } from "@/lib/rbac";
import { ok, paginated, handleApiError } from "@/lib/api-response";
import { parsePagination, toSkipTake } from "@/lib/pagination";
import { createPatientSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { generatePatientCode } from "@/lib/utils";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

// GET /api/patients?page=1&pageSize=20&search=jane&sortBy=createdAt&sortOrder=desc
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("UNAUTHENTICATED");
    const role = (session.user as any).role;
    assertCan(role, "patients", "read");

    const rl = await checkRateLimit("api", (session.user as any).id);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      });
    }

    const params = parsePagination(req.nextUrl.searchParams);
    const { skip, take } = toSkipTake(params);

    const where: Prisma.PatientWhereInput = params.search
      ? {
          OR: [
            { patientCode: { contains: params.search, mode: "insensitive" } },
            { user: { firstName: { contains: params.search, mode: "insensitive" } } },
            { user: { lastName: { contains: params.search, mode: "insensitive" } } },
            { user: { email: { contains: params.search, mode: "insensitive" } } },
          ],
        }
      : {};

    // Patients can only ever see their own record
    if (role === "PATIENT") {
      Object.assign(where, { userId: (session.user as any).id });
    }

    const sortableFields = new Set(["createdAt", "dateOfBirth", "patientCode"]);
    const orderBy = sortableFields.has(params.sortBy ?? "")
      ? { [params.sortBy as string]: params.sortOrder }
      : { createdAt: params.sortOrder };

    const [patients, total] = await prisma.$transaction([
      prisma.patient.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
          allergies: true,
          emergencyContacts: true,
        },
      }),
      prisma.patient.count({ where }),
    ]);

    return paginated(patients, { page: params.page, pageSize: params.pageSize, total });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/patients
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("UNAUTHENTICATED");
    const role = (session.user as any).role;
    assertCan(role, "patients", "create");

    const rl = await checkRateLimit("mutation", (session.user as any).id);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded" }), { status: 429 });
    }

    const body = await req.json();
    const data = createPatientSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return new Response(
        JSON.stringify({ success: false, error: "A user with this email already exists" }),
        { status: 409 }
      );
    }

    // Temporary password — patient completes real signup via emailed invite link
    const tempPassword = await bcrypt.hash(crypto.randomUUID(), 10);

    const patient = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          phone: data.phone,
          passwordHash: tempPassword,
          role: "PATIENT",
          firstName: data.firstName,
          lastName: data.lastName,
          hospitalId: (session.user as any).hospitalId ?? undefined,
        },
      });

      return tx.patient.create({
        data: {
          userId: user.id,
          patientCode: generatePatientCode(),
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          bloodGroup: data.bloodGroup,
          address: data.address,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
          allergies: data.allergies?.length
            ? { create: data.allergies }
            : undefined,
          emergencyContacts: { create: data.emergencyContacts },
          insurancePolicies: data.insurance
            ? { create: [data.insurance] }
            : undefined,
        },
        include: { user: true, allergies: true, emergencyContacts: true },
      });
    });

    await writeAuditLog({
      userId: (session.user as any).id,
      action: "PATIENT_CREATED",
      entityType: "Patient",
      entityId: patient.id,
      ipAddress: req.headers.get("x-forwarded-for"),
      userAgent: req.headers.get("user-agent"),
    });

    // TODO: send welcome/invite email with password-set link via notification service

    return ok(patient, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
