"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const item: ToastItem = { id, message, type, createdAt: Date.now() };
    setToasts((prev) => [...prev, item]);
    setTimeout(() => removeToast(id), TOAST_DURATION_MS);
  }, [removeToast]);

  const value = useMemo(
    () => ({ toasts, addToast, removeToast }),
    [toasts, addToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

function Toaster() {
  const context = useContext(ToastContext);
  if (!context) return null;
  const { toasts, removeToast } = context;
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 max-w-[min(calc(100vw-2rem),24rem)]"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} item={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ item }: { item: ToastItem; onDismiss: () => void }) {
  const styleByType = {
    success:
      "bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-700 dark:border-emerald-600",
    error:
      "bg-red-600 text-white border-red-700 dark:bg-red-700 dark:border-red-600",
    info:
      "bg-neutral-800 text-neutral-100 border-neutral-700 dark:bg-neutral-700 dark:border-neutral-600",
  };
  return (
    <div
      className={`animate-fade-in-up rounded-lg border px-4 py-3 shadow-lg text-sm font-medium ${styleByType[item.type]}`}
      role="alert"
    >
      <p className="break-words">{item.message}</p>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      addToast: () => {},
      toasts: [] as ToastItem[],
      removeToast: () => {},
    };
  }
  return ctx;
}
