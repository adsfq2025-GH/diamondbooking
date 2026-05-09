// src/components/ui/toaster.tsx
"use client";

import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-fade-in",
            "bg-card text-card-foreground",
            toast.variant === "destructive" && "border-destructive/30 bg-destructive/10",
            toast.variant === "success" && "border-green-200 bg-green-50",
            (!toast.variant || toast.variant === "default") && "border-border"
          )}
        >
          {toast.variant === "success" && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />}
          {toast.variant === "destructive" && <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
          {(!toast.variant || toast.variant === "default") && <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            {toast.title && <p className="text-sm font-medium text-foreground">{toast.title}</p>}
            {toast.description && <p className="text-xs text-muted-foreground mt-0.5">{toast.description}</p>}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
