"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/use-toast";

type StaffOption = { id: string; name: string; isActive: boolean };

export function ServiceEditForm({
  serviceId,
  initial,
  staff,
}: {
  serviceId: string;
  initial: {
    name: string;
    description: string | null;
    duration: number;
    price: number;
    color: string;
    isActive: boolean;
    staffIds: string[];
  };
  staff: StaffOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [duration, setDuration] = useState(initial.duration);
  const [price, setPrice] = useState(initial.price);
  const [color, setColor] = useState(initial.color);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [staffIds, setStaffIds] = useState<string[]>(initial.staffIds);

  const activeStaff = useMemo(() => staff.filter((s) => s.isActive), [staff]);

  const toggle = (id: string) => {
    setStaffIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast({ variant: "destructive", title: "Enter a service name" });
    if (!Number.isFinite(duration) || duration < 5) return toast({ variant: "destructive", title: "Enter a valid duration" });
    if (!Number.isFinite(price) || price < 0) return toast({ variant: "destructive", title: "Enter a valid price" });

    setLoading(true);
    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          duration: Number(duration),
          price: Number(price),
          color,
          isActive,
          staffIds,
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) {
        toast({ variant: "destructive", title: "Failed to update service", description: json.error ?? "Please try again" });
        return;
      }
      toast({ variant: "success", title: "Service updated" });
      router.push("/dashboard/services");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Service name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Duration (minutes)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            min={5}
            max={480}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Price</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            min={0}
            step="0.01"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor="active" className="text-sm text-foreground">Visible on booking page</label>
      </div>

      <div className="border border-border rounded-xl p-4">
        <p className="text-sm font-medium text-foreground mb-2">Staff who can perform this service</p>
        {activeStaff.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active staff members.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeStaff.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={staffIds.includes(m.id)}
                  onChange={() => toggle(m.id)}
                  className="h-4 w-4"
                />
                <span className="text-foreground">{m.name}</span>
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

