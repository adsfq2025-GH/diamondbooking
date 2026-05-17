"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/use-toast";

export function ClientForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast({ variant: "destructive", title: "Enter client name" });
    if (!email.trim()) return toast({ variant: "destructive", title: "Enter client email" });

    setLoading(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string; data?: { id: string } };
      if (!res.ok || !json.success) {
        toast({ variant: "destructive", title: "Failed to add client", description: json.error ?? "Please try again" });
        return;
      }
      toast({ variant: "success", title: "Client added" });
      router.push(`/dashboard/clients/${json.data!.id}`);
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
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
            inputMode="email"
            placeholder="jane@example.com"
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
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none"
          placeholder="Any notes about this client..."
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="gold" disabled={loading}>
          {loading ? "Saving..." : "Add Client"}
        </Button>
      </div>
    </form>
  );
}

