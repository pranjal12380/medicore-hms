import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { initials } from "@/lib/utils";
import { format } from "date-fns";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { search, page } = await searchParams;
  const pageNum = Number(page ?? 1);
  const pageSize = 10;

  const where = search
    ? {
        OR: [
          { patientCode: { contains: search, mode: "insensitive" as const } },
          { user: { firstName: { contains: search, mode: "insensitive" as const } } },
          { user: { lastName: { contains: search, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [patients, total] = await prisma.$transaction([
    prisma.patient.findMany({
      where,
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
    prisma.patient.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} registered patients</p>
        </div>
        <Button asChild>
          <Link href="/patients/new">
            <Plus className="mr-1 h-4 w-4" /> Register Patient
          </Link>
        </Button>
      </div>

      <form className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="search" defaultValue={search} placeholder="Search by name or patient code..." className="pl-9" />
      </form>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Gender</th>
              <th className="px-4 py-3 font-medium">Registered</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link href={`/patients/${p.id}`} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-primary">
                      {initials(p.user.firstName, p.user.lastName)}
                    </div>
                    <span className="font-medium">{p.user.firstName} {p.user.lastName}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.patientCode}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.user.email}</td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{p.gender.toLowerCase()}</td>
                <td className="px-4 py-3 text-muted-foreground">{format(p.createdAt, "MMM d, yyyy")}</td>
                <td className="px-4 py-3">
                  <Badge variant={p.user.isActive ? "success" : "destructive"}>
                    {p.user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
              </tr>
            ))}
            {patients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No patients found. Try a different search or register a new patient.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
