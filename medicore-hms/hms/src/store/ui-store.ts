import { create } from "zustand";

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  notifications: Notification[];
  unreadCount: number;
  pushNotification: (n: Notification) => void;
  markAllRead: () => void;

  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  notifications: [],
  unreadCount: 0,
  pushNotification: (n) =>
    set((s) => ({ notifications: [n, ...s.notifications], unreadCount: s.unreadCount + 1 })),
  markAllRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })), unreadCount: 0 })),

  theme: "light",
  setTheme: (theme) => {
    set({ theme });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  },
}));
