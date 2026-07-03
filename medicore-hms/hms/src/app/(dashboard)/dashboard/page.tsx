import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { AppointmentTrendChart } from "@/components/dashboard/appointment-trend-chart";
import { BedOccupancy } from "@/components/dashboard/bed-occupancy";
import { Users, CalendarClock, Stethoscope, Receipt } from "lucide-react";
import { subDays, startOfDay } from "date-fns";

async function getDashboardStats() {
  const [totalPatients, todayAppointments, activeDoctors, revenueThisMonth, beds] = await Promise.all([
    prisma.patient.count(),
    prisma.appointment.count({
      where: { scheduledStart: { gte: startOfDay(new Date()) }, status: { notIn: ["CANCELLED"] } },
    }),
    prisma.doctor.count(),
    prisma.payment.aggregate({
      where: { status: "SUCCESS", paidAt: { gte: startOfDay(subDays(new Date(), 30)) } },
      _sum: { amount: true },
    }),
    prisma.bed.findMany({ select: { status: true } }),
  ]);

  // last 14 days appointment volume
  const since = startOfDay(subDays(new Date(), 13));
  const recentAppointments = await prisma.appointment.findMany({
    where: { scheduledStart: { gte: since } },
    select: { scheduledStart: true, status: true },
  });

  const trend: Record<string, number> = {};
  for (let i = 0; i < 14; i++) {
    const day = startOfDay(subDays(new Date(), 13 - i)).toISOString().slice(0, 10);
    trend[day] = 0;
  }
  recentAppointments.forEach((a) => {
    const key = startOfDay(a.scheduledStart).toISOString().slice(0, 10);
    if (trend[key] !== undefined) trend[key]++;
  });

  const occupied = beds.filter((b) => b.status === "OCCUPIED").length;

  return {
    totalPatients,
    todayAppointments,
    activeDoctors,
    revenue: Number(revenueThisMonth._sum.amount ?? 0),
    trend: Object.entries(trend).map(([date, count]) => ({ date, count })),
    bedOccupancy: { total: beds.length, occupied, available: beds.length - occupied },
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Good to see you, {firstName}</h1>
        <p className="text-sm text-muted-foreground">Here's what's happening across the hospital today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Patients" value={stats.totalPatients.toLocaleString()} icon={Users} />
        <StatCard title="Today's Appointments" value={stats.todayAppointments.toString()} icon={CalendarClock} />
        <StatCard title="Active Doctors" value={stats.activeDoctors.toString()} icon={Stethoscope} />
        <StatCard
          title="Revenue (30d)"
          value={stats.revenue.toLocaleString(undefined, { style: "currency", currency: "USD" })}
          icon={Receipt}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AppointmentTrendChart data={stats.trend} />
        </div>
        <BedOccupancy data={stats.bedOccupancy} />
      </div>

      <RevenueChart />
    </div>
  );
}
