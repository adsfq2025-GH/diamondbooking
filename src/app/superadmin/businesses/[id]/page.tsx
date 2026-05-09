// src/app/superadmin/businesses/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime, formatCurrency, getPlanBadgeClass, cn } from "@/lib/utils";
import { BusinessAdminActions } from "@/components/superadmin/business-admin-actions";
import { ArrowLeft, MapPin, Phone, Mail, Globe, Users, Wrench, Calendar, UserCheck } from "lucide-react";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await prisma.business.findUnique({ where: { id }, select: { name: true } });
  return { title: business?.name ?? "Business Detail" };
}

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true, name: true, email: true, createdAt: true,
          lastLoginAt: true, isActive: true, emailVerified: true,
          subscription: true,
        },
      },
      businessHours: { orderBy: { dayOfWeek: "asc" } },
      staff: { where: { isActive: true }, select: { id: true, name: true, email: true } },
      services: { where: { isActive: true }, select: { id: true, name: true, price: true, duration: true } },
      _count: { select: { bookings: true, customers: true } },
      bookings: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          service: { select: { name: true } },
          customer: { select: { name: true, email: true } },
          staff: { select: { name: true } },
        },
      },
    },
  });

  if (!business) notFound();

  const sub = business.owner.subscription;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <Link
          href="/superadmin/businesses"
          className="p-2 rounded-lg bg-secondary hover:bg-border transition-colors text-muted-foreground hover:text-foreground shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold font-heading text-foreground">{business.name}</h2>
            <span className={getPlanBadgeClass(sub?.plan ?? "FREE")}>{sub?.plan ?? "FREE"}</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
              business.isActive ? "bg-green-500/20 text-green-400" : "bg-destructive/20 text-destructive"
            )}>
              {business.isActive ? "Active" : "Suspended"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">/book/{business.slug}</p>
        </div>
        <BusinessAdminActions business={{
          id: business.id,
          name: business.name,
          isActive: business.isActive,
          ownerId: business.ownerId,
          ownerEmail: business.owner.email,
          currentPlan: sub?.plan ?? "FREE",
          subscriptionId: sub?.id,
          trialEnd: sub?.trialEnd?.toISOString(),
        }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business info */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Business Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {business.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{business.phone}</span>
                </div>
              )}
              {business.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{business.email}</span>
                </div>
              )}
              {business.city && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{[business.city, business.state, business.country].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {business.website && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="w-3.5 h-3.5" />
                  <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate">
                    {business.website}
                  </a>
                </div>
              )}
            </div>
            {business.description && (
              <p className="mt-3 text-sm text-muted-foreground border-t border-border pt-3">{business.description}</p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Bookings", value: business._count.bookings, icon: Calendar },
              { label: "Total Clients", value: business._count.customers, icon: UserCheck },
              { label: "Active Staff", value: business.staff.length, icon: Users },
              { label: "Active Services", value: business.services.length, icon: Wrench },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-secondary rounded-lg p-3 text-center">
                <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-bold font-heading text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Recent bookings */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Recent Bookings</h3>
            {business.bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No bookings yet</p>
            ) : (
              <div className="space-y-2">
                {business.bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{b.customer.name}</p>
                      <p className="text-xs text-muted-foreground">{b.service.name} · {b.staff.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-foreground">{formatDate(b.startTime, "MMM d")}</p>
                      <span className={cn("text-xs", {
                        "text-green-400": b.status === "CONFIRMED" || b.status === "COMPLETED",
                        "text-red-400": b.status === "CANCELLED",
                        "text-yellow-400": b.status === "PENDING",
                        "text-muted-foreground": b.status === "NO_SHOW",
                      })}>
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Services */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Services ({business.services.length})</h3>
            <div className="grid grid-cols-2 gap-2">
              {business.services.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2.5 bg-secondary rounded-lg">
                  <span className="text-sm text-foreground">{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.duration}min · {formatCurrency(Number(s.price))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Owner info */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Owner Account</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="text-foreground font-medium">{business.owner.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground truncate max-w-36">{business.owner.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verified</span>
                <span className={business.owner.emailVerified ? "text-green-400" : "text-red-400"}>
                  {business.owner.emailVerified ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined</span>
                <span className="text-foreground">{formatDate(business.owner.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Login</span>
                <span className="text-foreground">
                  {business.owner.lastLoginAt ? formatDate(business.owner.lastLoginAt) : "Never"}
                </span>
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Subscription</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className={getPlanBadgeClass(sub?.plan ?? "FREE")}>{sub?.plan ?? "FREE"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={cn("font-medium", {
                  "text-green-400": sub?.status === "ACTIVE",
                  "text-blue-400": sub?.status === "TRIALING",
                  "text-red-400": sub?.status === "PAST_DUE" || sub?.status === "CANCELLED",
                  "text-yellow-400": sub?.status === "INCOMPLETE",
                })}>
                  {sub?.status ?? "None"}
                </span>
              </div>
              {sub?.currentPeriodEnd && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Renews</span>
                  <span className="text-foreground">{formatDate(sub.currentPeriodEnd)}</span>
                </div>
              )}
              {sub?.trialEnd && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trial ends</span>
                  <span className="text-foreground">{formatDate(sub.trialEnd)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Admin notes */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Admin Notes</h3>
            <p className="text-xs text-muted-foreground mb-2">Only visible to Super Admins</p>
            <AdminNotesForm businessId={business.id} currentNotes={business.adminNotes} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline server component for notes form
function AdminNotesForm({ businessId, currentNotes }: { businessId: string; currentNotes: string | null }) {
  return (
    <form action={async (formData: FormData) => {
      "use server";
      const { requireSuperAdmin } = await import("@/lib/auth");
      await requireSuperAdmin();
      await prisma.business.update({
        where: { id: businessId },
        data: { adminNotes: formData.get("notes") as string },
      });
    }}>
      <textarea
        name="notes"
        defaultValue={currentNotes ?? ""}
        rows={4}
        placeholder="Internal notes about this business..."
        className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
      />
      <button
        type="submit"
        className="mt-2 w-full px-3 py-2 text-xs font-medium bg-secondary text-foreground rounded-lg hover:bg-border transition-colors"
      >
        Save Notes
      </button>
    </form>
  );
}
