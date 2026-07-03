"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";
import {
  LayoutDashboard, Users, Stethoscope, CalendarClock, FileText,
  FlaskConical, Pill, Receipt, Boxes, UserCog, ShieldAlert, Activity,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ElementType; roles: Role[] };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ["SUPER_ADMIN","HOSPITAL_ADMIN","DOCTOR","NURSE","RECEPTIONIST","LAB_TECHNICIAN","PHARMACIST","ACCOUNTANT","PATIENT"] },
  { href: "/dashboard/patients", label: "Patients", icon: Users, roles: ["SUPER_ADMIN","HOSPITAL_ADMIN","DOCTOR","NURSE","RECEPTIONIST"] },
  { href: "/dashboard/doctors", label: "Doctors", icon: Stethoscope, roles: ["SUPER_ADMIN","HOSPITAL_ADMIN","RECEPTIONIST"] },
  { href: "/dashboard/appointments", label: "Appointments", icon: CalendarClock, roles: ["SUPER_ADMIN","HOSPITAL_ADMIN","DOCTOR","NURSE","RECEPTIONIST","PATIENT"] },
  { href: "/dashboard/records", label: "Medical Records", icon: FileText, roles: ["SUPER_ADMIN","HOSPITAL_ADMIN","DOCTOR","NURSE","PATIENT"] },
  { href: "/dashboard/lab", label: "Laboratory", icon: FlaskConical, roles: ["SUPER_ADMIN","HOSPITAL_ADMIN","LAB_TECHNICIAN","DOCTOR"] },
  { href: "/dashboard/pharmacy", label: "Pharmacy", icon: Pill, roles: ["SUPER_ADMIN","HOSPITAL_ADMIN","PHARMACIST"] },
  { href: "/dashboard/billing", label: "Billing", icon: Receipt, roles: ["SUPER_ADMIN","HOSPITAL_ADMIN","ACCOUNTANT","PATIENT"] },
  { href: "/dashboard/inventory", label: "Inventory", icon: Boxes, roles: ["SUPER_ADMIN","HOSPITAL_ADMIN"] },
  { href: "/dashboard/staff", label: "Staff", icon: UserCog, roles: ["SUPER_ADMIN","HOSPITAL_ADMIN"] },
  { href: "/dashboard/audit-logs", label: "Audit Logs", icon: ShieldAlert, roles: ["SUPER_ADMIN","HOSPITAL_ADMIN"] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV.filter((item) => item.roles.includes(role));

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <Activity className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold tracking-tight">MediCore</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
