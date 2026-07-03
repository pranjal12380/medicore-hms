import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertCan } from "@/lib/rbac";
import { ok, handleApiError } from "@/lib/api-response";
import { updatePatientSchema } from "@/lib/validations";
import { writeAuditLog } from "@/lib/audit";

async function loadPatientOrThrow(id: string) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
      allergies: true,
      emergencyContacts: true,
      insurancePolicies: true,
      medicalHistories: true,
    },
  });
  if (!patient) throw new Error("NOT_FOUND");
  return patient;
}

function assertSelfOrStaff(session: any, patientUserId: string) {
  const role = session.user.role;
  if (role === "PATIENT" && session.user.id !== patientUserId) {
    throw new Error("NOT_FOUND"); // don't leak existence to other patients
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) throw new Error("UNAUTHENTICATED");
    assertCan((session.user as any).role, "patients", "read");

    const patient = await loadPatientOrThrow(id);
    assertSelfOrStaff(session, patient.userId);

    return ok(patient);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) throw new Error("UNAUTHENTICATED");
    assertCan((session.user as any).role, "patients", "update");

    const existing = await loadPatientOrThrow(id);
    assertSelfOrStaff(session, existing.userId);

    const body = await req.json();
    const data = updatePatientSchema.parse(body);

    const updated = await prisma.$transaction(async (tx) => {
      if (data.firstName || data.lastName || data.phone) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
          },
        });
      }

      return tx.patient.update({
        where: { id },
        data: {
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          bloodGroup: data.bloodGroup,
          address: data.address,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
        },
        include: { user: true, allergies: true, emergencyContacts: true },
      });
    });

    await writeAuditLog({
      userId: (session.user as any).id,
      action: "PATIENT_UPDATED",
      entityType: "Patient",
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });

    return ok(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) throw new Error("UNAUTHENTICATED");
    assertCan((session.user as any).role, "patients", "delete");

    await loadPatientOrThrow(id);

    // Soft-delete pattern: deactivate the linked user instead of hard delete,
    // to preserve medical/billing history integrity (HIPAA-style retention).
    const patient = await prisma.patient.findUniqueOrThrow({ where: { id } });
    await prisma.user.update({ where: { id: patient.userId }, data: { isActive: false } });

    await writeAuditLog({
      userId: (session.user as any).id,
      action: "PATIENT_DEACTIVATED",
      entityType: "Patient",
      entityId: id,
    });

    return ok({ id, deactivated: true });
  } catch (error) {
    return handleApiError(error);
  }
}
