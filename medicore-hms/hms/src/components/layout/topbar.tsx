"use client";

import { Bell, Moon, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/utils";

export function Topbar({ userName, role }: { userName: string; role: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search patients, doctors, records..." className="pl-9" />
      </div>
      <div className="flex items-center gap-4">
        <button aria-label="Toggle dark mode" className="rounded-md p-2 hover:bg-muted">
          <Moon className="h-4 w-4" />
        </button>
        <button aria-label="Notifications" className="relative rounded-md p-2 hover:bg-muted">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
            {initials(userName.split(" ")[0] ?? "", userName.split(" ")[1] ?? "")}
          </div>
          <div className="hidden text-sm leading-tight sm:block">
            <div className="font-medium">{userName}</div>
            <div className="text-xs capitalize text-muted-foreground">{role.replace("_", " ").toLowerCase()}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
