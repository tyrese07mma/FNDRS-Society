import { create } from 'zustand';

export type ToastTone = 'default' | 'success' | 'error' | 'accent';

export interface ToastItem {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
}

interface ToastState {
  items: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (t) => {
    const id = ++seq;
    set((s) => ({ items: [...s.items.slice(-2), { ...t, id }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((x) => x.id !== id) })), 3200);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

/** Imperative toasts, callable from anywhere (mutations, event handlers). */
export const toast = {
  show: (title: string, message?: string) => useToastStore.getState().push({ title, message, tone: 'default' }),
  success: (title: string, message?: string) => useToastStore.getState().push({ title, message, tone: 'success' }),
  error: (title: string, message?: string) => useToastStore.getState().push({ title, message, tone: 'error' }),
  accent: (title: string, message?: string) => useToastStore.getState().push({ title, message, tone: 'accent' }),
};
