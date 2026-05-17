import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function PortalProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/portal/login");
  if (session.user.role !== "CUSTOMER") redirect("/dashboard");

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
