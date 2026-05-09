// src/components/superadmin/business-admin-actions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal, ShieldOff, ShieldCheck, RefreshCw,
  Trash2, UserCog, Mail, ChevronDown,
} from "lucide-react";

interface BusinessAdminActionsProps {
  business: {
    id: string;
    name: string;
    isActive: boolean;
    ownerId: string;
    ownerEmail: string | null;
    currentPlan: string;
    subscriptionId?: string;
    trialEnd?: string;
  };
}

const PLANS = ["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE"];

export function BusinessAdminActions({ business }: BusinessAdminActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPlanChange, setShowPlanChange] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(business.currentPlan);

  const call = async (action: string, body?: Record<string, unknown>) => {
    setLoading(action);
    try {
      const res = await fetch(`/api/superadmin/businesses/${business.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Request failed");
      router.refresh();
    } finally {
      setLoading(null);
      setOpen(false);
    }
  };

  const changePlan = async () => {
    setLoading("plan");
    try {
      await fetch(`/api/superadmin/businesses/${business.id}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      router.refresh();
      setShowPlanChange(false);
    } finally {
      setLoading(null);
    }
  };

  const deleteBusiness = async () => {
    if (deleteConfirmName !== business.name) return;
    setLoading("delete");
    try {
      await fetch(`/api/superadmin/businesses/${business.id}`, { method: "DELETE" });
      router.push("/superadmin/businesses");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Quick actions */}
        <button
          onClick={() => call("toggle-active", { isActive: !business.isActive })}
          disabled={!!loading}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
            business.isActive
              ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
              : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
          }`}
        >
          {business.isActive ? (
            <><ShieldOff className="w-3.5 h-3.5" /> Suspend</>
          ) : (
            <><ShieldCheck className="w-3.5 h-3.5" /> Reactivate</>
          )}
        </button>

        <button
          onClick={() => setShowPlanChange(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-secondary text-foreground rounded-lg hover:bg-border transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Change Plan
        </button>

        {/* More */}
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-border transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 w-48 bg-card border border-border rounded-xl shadow-lg py-1">
            <button
              onClick={() => { setOpen(false); setShowDeleteConfirm(true); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Business
            </button>
            <a
              href={`mailto:${business.ownerEmail}`}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              Email Owner
            </a>
          </div>
        </>
      )}

      {/* Plan change modal */}
      {showPlanChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-xl p-6 w-80 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Change Plan</h3>
            <p className="text-xs text-muted-foreground">
              Manually override the subscription plan for <strong>{business.name}</strong>.
            </p>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground"
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPlanChange(false)}
                className="flex-1 px-3 py-2 text-xs font-medium bg-secondary text-foreground rounded-lg hover:bg-border"
              >
                Cancel
              </button>
              <button
                onClick={changePlan}
                disabled={loading === "plan"}
                className="flex-1 px-3 py-2 text-xs font-medium bg-accent text-primary rounded-lg hover:bg-accent/90 disabled:opacity-50"
              >
                {loading === "plan" ? "Saving..." : "Save Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-destructive/30 rounded-xl p-6 w-96 space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Delete Business</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              This will deactivate the business and cancel their subscription. Type the business name to confirm:
            </p>
            <p className="text-xs font-mono bg-secondary px-2 py-1 rounded text-foreground">{business.name}</p>
            <input
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="Type business name..."
              className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName(""); }}
                className="flex-1 px-3 py-2 text-xs font-medium bg-secondary text-foreground rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={deleteBusiness}
                disabled={deleteConfirmName !== business.name || loading === "delete"}
                className="flex-1 px-3 py-2 text-xs font-medium bg-destructive text-white rounded-lg disabled:opacity-40"
              >
                {loading === "delete" ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
