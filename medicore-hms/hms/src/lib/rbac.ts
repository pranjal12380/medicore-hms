import { Role } from "@prisma/client";

/**
 * Central RBAC permission matrix.
 * Every protected route / server action should check `can()` against this map
 * rather than hardcoding role checks inline, so the whole authorization
 * surface stays auditable in one file.
 */

export type Resource =
  | "patients"
  | "doctors"
  | "appointments"
  | "medicalRecords"
  | "prescriptions"
  | "labTests"
  | "pharmacy"
  | "billing"
  | "inventory"
  | "staff"
  | "reports"
  | "auditLogs"
  | "hospitalSettings";

export type Action = "create" | "read" | "update" | "delete" | "approve";

type PermissionMap = Record<Role, Partial<Record<Resource, Action[]>>>;

const ALL: Action[] = ["create", "read", "update", "delete", "approve"];

export const PERMISSIONS: PermissionMap = {
  SUPER_ADMIN: {
    patients: ALL,
    doctors: ALL,
    appointments: ALL,
    medicalRecords: ALL,
    prescriptions: ALL,
    labTests: ALL,
    pharmacy: ALL,
    billing: ALL,
    inventory: ALL,
    staff: ALL,
    reports: ALL,
    auditLogs: ["read"],
    hospitalSettings: ALL,
  },
  HOSPITAL_ADMIN: {
    patients: ALL,
    doctors: ALL,
    appointments: ALL,
    medicalRecords: ["read"],
    prescriptions: ["read"],
    labTests: ["read"],
    pharmacy: ["read", "update"],
    billing: ALL,
    inventory: ALL,
    staff: ALL,
    reports: ["read"],
    auditLogs: ["read"],
    hospitalSettings: ["read", "update"],
  },
  DOCTOR: {
    patients: ["read", "update"],
    doctors: ["read"],
    appointments: ["read", "update"],
    medicalRecords: ["create", "read", "update"],
    prescriptions: ["create", "read", "update"],
    labTests: ["create", "read"],
    reports: ["read"],
  },
  NURSE: {
    patients: ["read", "update"],
    appointments: ["read", "update"],
    medicalRecords: ["read", "update"],
    prescriptions: ["read"],
    labTests: ["read"],
  },
  RECEPTIONIST: {
    patients: ["create", "read", "update"],
    doctors: ["read"],
    appointments: ["create", "read", "update", "delete"],
    billing: ["create", "read"],
  },
  LAB_TECHNICIAN: {
    patients: ["read"],
    labTests: ["read", "update", "approve"],
  },
  PHARMACIST: {
    patients: ["read"],
    prescriptions: ["read", "update"],
    pharmacy: ALL,
  },
  ACCOUNTANT: {
    billing: ALL,
    reports: ["read"],
    staff: ["read"],
  },
  PATIENT: {
    appointments: ["create", "read", "update"], // own only, enforced at query layer
    medicalRecords: ["read"], // own only
    prescriptions: ["read"], // own only
    labTests: ["read"], // own only
    billing: ["read"], // own only
  },
};

export function can(role: Role, resource: Resource, action: Action): boolean {
  return PERMISSIONS[role]?.[resource]?.includes(action) ?? false;
}

/**
 * Throws-style guard for use in API route handlers / server actions.
 * Usage: assertCan(session.user.role, "patients", "create")
 */
export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertCan(role: Role, resource: Resource, action: Action) {
  if (!can(role, resource, action)) {
    throw new ForbiddenError(
      `Role ${role} cannot ${action} on ${resource}`
    );
  }
}

/** Roles allowed to see cross-patient data vs. only their own record. */
export const SELF_SCOPED_ROLES: Role[] = ["PATIENT"];
export const CLINICAL_ROLES: Role[] = ["DOCTOR", "NURSE"];
export const STAFF_ROLES: Role[] = [
  "HOSPITAL_ADMIN",
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "LAB_TECHNICIAN",
  "PHARMACIST",
  "ACCOUNTANT",
];
