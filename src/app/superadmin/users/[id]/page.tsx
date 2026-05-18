import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { UserActions } from "./user-actions";

export const metadata = { title: "User" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function SuperAdminUserPage({ params }: Params) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      business: { select: { id: true, name: true, slug: true } },
      subscription: true,
      accounts: { select: { provider: true } },
    },
  });

  if (!user) redirect("/superadmin/users");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold font-heading text-foreground">{user.name ?? "User"}</h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/superadmin/users"
            className="px-3 py-1.5 text-xs font-medium bg-secondary text-foreground rounded-lg hover:bg-border"
          >
            Back
          </Link>
          <UserActions userId={user.id} isActive={user.isActive} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-medium text-muted-foreground">Status</p>
          <p className="text-base font-semibold text-foreground mt-1">{user.isActive ? "Active" : "Disabled"}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-medium text-muted-foreground">Role</p>
          <p className="text-base font-semibold text-foreground mt-1">{user.role}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-medium text-muted-foreground">Joined</p>
          <p className="text-base font-semibold text-foreground mt-1">{formatDate(user.createdAt)}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Business</p>
          {user.business ? (
            <Link href={`/superadmin/businesses/${user.business.id}`} className="text-xs text-accent hover:underline">
              View
            </Link>
          ) : null}
        </div>
        {user.business ? (
          <div className="text-sm">
            <p className="text-foreground font-medium">{user.business.name}</p>
            <p className="text-xs text-muted-foreground">{user.business.slug}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No business linked</p>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-foreground">Subscription</p>
        {user.subscription ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="font-medium text-foreground">{user.subscription.plan}</p>
            </div>
            <div className="p-3 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-medium text-foreground">{user.subscription.status}</p>
            </div>
            <div className="p-3 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">Stripe Customer</p>
              <p className="font-medium text-foreground">{user.subscription.stripeCustomerId ?? "—"}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No subscription record</p>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-2">
        <p className="text-sm font-semibold text-foreground">Auth Providers</p>
        {user.accounts.length ? (
          <p className="text-sm text-muted-foreground">{user.accounts.map((a) => a.provider).join(", ")}</p>
        ) : (
          <p className="text-sm text-muted-foreground">credentials</p>
        )}
      </div>
    </div>
  );
}

