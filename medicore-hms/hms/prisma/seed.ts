import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hospital = await prisma.hospital.create({
    data: { name: "MediCore General Hospital", city: "Springfield", country: "USA", timezone: "America/Chicago" },
  });

  const password = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@medicore.dev", passwordHash: password, role: "HOSPITAL_ADMIN",
      firstName: "Alex", lastName: "Morgan", hospitalId: hospital.id, emailVerifiedAt: new Date(),
    },
  });

  const department = await prisma.department.create({
    data: { hospitalId: hospital.id, name: "Cardiology", description: "Heart & vascular care" },
  });

  const doctorUser = await prisma.user.create({
    data: {
      email: "doctor@medicore.dev", passwordHash: password, role: "DOCTOR",
      firstName: "Priya", lastName: "Nair", hospitalId: hospital.id, emailVerifiedAt: new Date(),
    },
  });

  const doctor = await prisma.doctor.create({
    data: {
      userId: doctorUser.id, departmentId: department.id, specialization: "Cardiologist",
      licenseNumber: "MD-10293", experienceYears: 9, consultationFee: 120,
      availabilities: {
        create: [1, 2, 3, 4, 5].map((day) => ({ dayOfWeek: day, startTime: "09:00", endTime: "17:00", slotMins: 30 })),
      },
    },
  });

  const patientUser = await prisma.user.create({
    data: {
      email: "patient@medicore.dev", passwordHash: password, role: "PATIENT",
      firstName: "Jordan", lastName: "Lee", emailVerifiedAt: new Date(),
    },
  });

  await prisma.patient.create({
    data: {
      userId: patientUser.id, patientCode: "PT-2026-0001", dateOfBirth: new Date("1990-04-12"), gender: "OTHER",
      bloodGroup: "O+",
      emergencyContacts: { create: [{ name: "Sam Lee", relationship: "Sibling", phone: "+15551234567" }] },
      allergies: { create: [{ substance: "Penicillin", severity: "severe" }] },
    },
  });

  const roles = [
    ["nurse@medicore.dev", "NURSE", "Nina", "Ray"],
    ["reception@medicore.dev", "RECEPTIONIST", "Ravi", "Singh"],
    ["lab@medicore.dev", "LAB_TECHNICIAN", "Lena", "Ortiz"],
    ["pharmacy@medicore.dev", "PHARMACIST", "Paul", "Kim"],
    ["accounts@medicore.dev", "ACCOUNTANT", "Amara", "Diaz"],
  ] as const;

  for (const [email, role, firstName, lastName] of roles) {
    await prisma.user.create({
      data: { email, passwordHash: password, role, firstName, lastName, hospitalId: hospital.id, emailVerifiedAt: new Date() },
    });
  }

  for (let i = 0; i < 10; i++) {
    await prisma.bed.create({
      data: { hospitalId: hospital.id, ward: i < 5 ? "General Ward" : "ICU", bedNumber: `B-${100 + i}`, status: i % 3 === 0 ? "OCCUPIED" : "AVAILABLE" },
    });
  }

  console.log("Seed complete. Demo login: admin@medicore.dev / Password123!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
