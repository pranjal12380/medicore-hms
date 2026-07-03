import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCan } from "@/lib/rbac";
import { ok, paginated, handleApiError } from "@/lib/api-response";
import { parsePagination, toSkipTake } from "@/lib/pagination";
import { createAppointmentSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

// GET /api/appointments?doctorId=&patientId=&status=&from=&to=
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("UNAUTHENTICATED");
    const role = (session.user as any).role;
    assertCan(role, "appointments", "read");

    const params = parsePagination(req.nextUrl.searchParams);
    const { skip, take } = toSkipTake(params);
    const sp = req.nextUrl.searchParams;

    const where: Prisma.AppointmentWhereInput = {};
    if (sp.get("doctorId")) where.doctorId = sp.get("doctorId")!;
    if (sp.get("patientId")) where.patientId = sp.get("patientId")!;
    if (sp.get("status")) where.status = sp.get("status") as any;
    if (sp.get("from") || sp.get("to")) {
      where.scheduledStart = {
        gte: sp.get("from") ? new Date(sp.get("from")!) : undefined,
        lte: sp.get("to") ? new Date(sp.get("to")!) : undefined,
      };
    }

    // Scope: doctors see only their own schedule, patients see only their own bookings
    if (role === "DOCTOR") {
      const doctor = await prisma.doctor.findUnique({ where: { userId: (session.user as any).id } });
      if (doctor) where.doctorId = doctor.id;
    }
    if (role === "PATIENT") {
      const patient = await prisma.patient.findUnique({ where: { userId: (session.user as any).id } });
      if (patient) where.patientId = patient.id;
    }

    const [appointments, total] = await prisma.$transaction([
      prisma.appointment.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledStart: params.sortOrder },
        include: {
          patient: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
          doctor: {
            include: {
              user: { select: { firstName: true, lastName: true, avatarUrl: true } },
              department: { select: { name: true } },
            },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return paginated(appointments, { page: params.page, pageSize: params.pageSize, total });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/appointments — books a slot with conflict + availability checks
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error("UNAUTHENTICATED");
    const role = (session.user as any).role;
    assertCan(role, "appointments", "create");

    const body = await req.json();
    const data = createAppointmentSchema.parse(body);

    const appointment = await prisma.$transaction(async (tx) => {
      // 1. Confirm doctor works this weekday within these hours
      const dayOfWeek = data.scheduledStart.getDay();
      const availability = await tx.doctorAvailability.findFirst({
        where: { doctorId: data.doctorId, dayOfWeek, isActive: true },
      });
      if (!availability) {
        throw new Error("DOCTOR_NOT_AVAILABLE_THAT_DAY");
      }

      // 2. Reject if doctor is on approved leave covering this date
      const onLeave = await tx.leaveRequest.findFirst({
        where: {
          doctorId: data.doctorId,
          status: "APPROVED",
          startDate: { lte: data.scheduledStart },
          endDate: { gte: data.scheduledStart },
        },
      });
      if (onLeave) throw new Error("DOCTOR_ON_LEAVE");

      // 3. Prevent overlapping bookings for the same doctor (double-booking guard)
      const conflict = await tx.appointment.findFirst({
        where: {
          doctorId: data.doctorId,
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
          AND: [
            { scheduledStart: { lt: data.scheduledEnd } },
            { scheduledEnd: { gt: data.scheduledStart } },
          ],
        },
      });
      if (conflict) throw new Error("SLOT_TAKEN");

      // 4. Compute today's queue number for this doctor
      const dayStart = new Date(data.scheduledStart);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const countToday = await tx.appointment.count({
        where: {
          doctorId: data.doctorId,
          scheduledStart: { gte: dayStart, lt: dayEnd },
          status: { notIn: ["CANCELLED"] },
        },
      });

      return tx.appointment.create({
        data: {
          patientId: data.patientId,
          doctorId: data.doctorId,
          scheduledStart: data.scheduledStart,
          scheduledEnd: data.scheduledEnd,
          type: data.type,
          reason: data.reason,
          status: "PENDING",
          queueNumber: countToday + 1,
        },
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
        },
      });
    });

    await writeAuditLog({
      userId: (session.user as any).id,
      action: "APPOINTMENT_BOOKED",
      entityType: "Appointment",
      entityId: appointment.id,
    });

    // TODO: emit socket.io event "appointment:created" to notify doctor's dashboard
    // TODO: enqueue email/SMS reminder job (24h and 1h before scheduledStart)

    return ok(appointment, 201);
  } catch (error: any) {
    if (error.message === "SLOT_TAKEN") {
      return new Response(
        JSON.stringify({ success: false, error: "This time slot was just booked. Please choose another." }),
        { status: 409 }
      );
    }
    if (error.message === "DOCTOR_NOT_AVAILABLE_THAT_DAY") {
      return new Response(
        JSON.stringify({ success: false, error: "Doctor does not have hours on this day." }),
        { status: 422 }
      );
    }
    if (error.message === "DOCTOR_ON_LEAVE") {
      return new Response(
        JSON.stringify({ success: false, error: "Doctor is on leave on this date." }),
        { status: 422 }
      );
    }
    return handleApiError(error);
  }
}
