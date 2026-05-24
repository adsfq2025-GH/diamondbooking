"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/use-toast";

type ServiceOption = { id: string; name: string; isActive: boolean; color: string };

export function StaffForm({ services }: { services: ServiceOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [payRate, setPayRate] = useState("");
  const [payRateType, setPayRateType] = useState<"HOURLY" | "PER_SALE" | "PER_DAY" | "PER_JOB">("HOURLY");
  const [serviceIds, setServiceIds] = useState<string[]>([]);

  const activeServices = useMemo(() => services.filter((s) => s.isActive), [services]);

  const toggle = (id: string) => {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast({ variant: "destructive", title: "Enter a staff name" });

    setLoading(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          payRate: payRate.trim() ? Number(payRate) : undefined,
          payRateType,
          serviceIds,
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        toast({ variant: "destructive", title: "Failed to add staff", description: json.error ?? "Please try again" });
        return;
      }
      toast({ variant: "success", title: "Staff added" });
      router.push("/dashboard/staff");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
            placeholder="Alex Johnson"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Email (optional)</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
            inputMode="email"
            placeholder="alex@business.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Phone (optional)</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
            placeholder="+1 555 555 5555"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Pay rate (optional)</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={payRate}
              onChange={(e) => setPayRate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
              inputMode="decimal"
              placeholder="0.00"
            />
            <select
              value={payRateType}
              onChange={(e) => setPayRateType(e.target.value as typeof payRateType)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
            >
              <option value="HOURLY">Per hour</option>
              <option value="PER_SALE">Per sale</option>
              <option value="PER_DAY">Per day</option>
              <option value="PER_JOB">Per job</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border border-border rounded-xl p-4">
        <p className="text-sm font-medium text-foreground mb-2">Services this staff member can perform</p>
        {activeServices.length === 0 ? (
          <p className="text-xs text-muted-foreground">Create services first, then assign them here.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeServices.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={serviceIds.includes(s.id)}
                  onChange={() => toggle(s.id)}
                  className="h-4 w-4"
                />
                <span className="inline-flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-foreground truncate">{s.name}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="gold" disabled={loading}>
          {loading ? "Saving..." : "Add Staff Member"}
        </Button>
      </div>
    </form>
  );
}

