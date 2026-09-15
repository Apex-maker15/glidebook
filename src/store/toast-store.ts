import { create } from "zustand";

export interface Toast {
  id: string;
  tone: "success" | "error" | "info";
  title: string;
  description?: string;
}

interface ToastState {
  toasts: Toast[];
  push(toast: Omit<Toast, "id">): string;
  dismiss(id: string): void;
}

const TOAST_MS = 4500;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push(toast) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...toast, id }] }));
    setTimeout(() => get().dismiss(id), TOAST_MS);
    return id;
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
