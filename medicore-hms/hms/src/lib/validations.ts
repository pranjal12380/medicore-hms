import { z } from "zod";

export const genderEnum = z.enum(["MALE", "FEMALE", "OTHER", "UNDISCLOSED"]);

export const createPatientSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter a valid phone number").max(20),
  dateOfBirth: z.coerce.date().refine((d) => d < new Date(), "Date of birth must be in the past"),
  gender: genderEnum,
  bloodGroup: z.string().max(5).optional(),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  allergies: z
    .array(
      z.object({
        substance: z.string().min(1),
        reaction: z.string().optional(),
        severity: z.enum(["mild", "moderate", "severe"]).optional(),
      })
    )
    .optional(),
  emergencyContacts: z
    .array(
      z.object({
        name: z.string().min(1),
        relationship: z.string().min(1),
        phone: z.string().min(7),
        email: z.string().email().optional().or(z.literal("")),
      })
    )
    .min(1, "At least one emergency contact is required"),
  insurance: z
    .object({
      provider: z.string().min(1),
      policyNumber: z.string().min(1),
      groupNumber: z.string().optional(),
    })
    .optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = createPatientSchema.partial();

export const createDoctorSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  departmentId: z.string().cuid("Select a valid department"),
  specialization: z.string().min(1).max(150),
  licenseNumber: z.string().min(1).max(50),
  qualifications: z.string().max(500).optional(),
  experienceYears: z.coerce.number().int().min(0).max(70).optional(),
  consultationFee: z.coerce.number().min(0).optional(),
  bio: z.string().max(1000).optional(),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;

export const createAppointmentSchema = z
  .object({
    patientId: z.string().cuid(),
    doctorId: z.string().cuid(),
    scheduledStart: z.coerce.date(),
    scheduledEnd: z.coerce.date(),
    type: z.enum(["IN_PERSON", "TELEHEALTH", "FOLLOW_UP", "EMERGENCY"]).default("IN_PERSON"),
    reason: z.string().max(500).optional(),
  })
  .refine((data) => data.scheduledEnd > data.scheduledStart, {
    message: "End time must be after start time",
    path: ["scheduledEnd"],
  })
  .refine((data) => data.scheduledStart > new Date(), {
    message: "Appointments must be booked in the future",
    path: ["scheduledStart"],
  });

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentStatusSchema = z.object({
  status: z.enum([
    "PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS",
    "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED",
  ]),
  cancelReason: z.string().max(500).optional(),
});

export const registerUserSchema = z
  .object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().min(7).max(20).optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
  mfaCode: z.string().length(6).optional(),
});
