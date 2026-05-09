// src/lib/use-toast.ts
"use client";

import { useState, useCallback } from "react";

type ToastVariant = "default" | "destructive" | "success";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastInput {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

// Global state via module-level variable + listeners
let toasts: Toast[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function toast(input: ToastInput) {
  const id = Math.random().toString(36).slice(2);
  const newToast: Toast = { id, duration: 4000, ...input };
  toasts = [...toasts, newToast];
  notify();

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, newToast.duration);

  return id;
}

export function useToast() {
  const [, setCount] = useState(0);

  const subscribe = useCallback(() => {
    const update = () => setCount((c) => c + 1);
    listeners.add(update);
    return () => listeners.delete(update);
  }, []);

  // Subscribe on mount
  useState(() => {
    const cleanup = subscribe();
    return cleanup;
  });

  const dismiss = useCallback((id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, []);

  return { toasts, dismiss };
}
