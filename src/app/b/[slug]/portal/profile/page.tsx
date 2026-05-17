import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { portalBasePath } from "@/lib/tenant-paths";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function TenantPortalProfilePage({ params }: Props) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user) redirect(`/b/${slug}/portal/login`);
  if (session.user.role !== "CUSTOMER") redirect("/dashboard");
  if (session.user.businessSlug !== slug) redirect(portalBasePath(session.user.businessSlug));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold font-heading text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground">Account details for the client portal.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Name</span>
            <span className="text-foreground">{session.user.name ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground">{session.user.email}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
