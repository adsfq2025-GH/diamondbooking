"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/use-toast";

type ServiceOption = { id: string; name: string; isActive: boolean; color: string };

export function StaffEditForm({
  staffId,
  initial,
  services,
}: {
  staffId: string;
  initial: {
    name: string;
    email: string | null;
    phone: string | null;
    isActive: boolean;
    serviceIds: string[];
  };
  services: ServiceOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [isActive, setIsActive] = useState(initial.isActive);
  const [serviceIds, setServiceIds] = useState<string[]>(initial.serviceIds);

  const activeServices = useMemo(() => services.filter((s) => s.isActive), [services]);

  const toggle = (id: string) => {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast({ variant: "destructive", title: "Enter a staff name" });

    setLoading(true);
    try {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          isActive,
          serviceIds,
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        toast({ variant: "destructive", title: "Failed to update staff", description: json.error ?? "Please try again" });
        return;
      }
      toast({ variant: "success", title: "Staff updated" });
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
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Email (optional)</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
            inputMode="email"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Phone (optional)</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor="active" className="text-sm text-foreground">Active staff member</label>
      </div>

      <div className="border border-border rounded-xl p-4">
        <p className="text-sm font-medium text-foreground mb-2">Services this staff member can perform</p>
        {activeServices.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active services.</p>
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
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

