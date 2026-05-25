import { AuthShell } from "@/components/auth/auth-shell";
import { EnvironmentChooser } from "@/components/tenant/environment-chooser";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Staff Portal" };
export const dynamic = "force-dynamic";

export default async function StaffLoginPage() {
  const session = await auth();
  if (session?.user) redirect("/post-login");

  return (
    <AuthShell title="Staff Portal" subtitle="Enter your business slug to sign in.">
      <EnvironmentChooser area="staff" action="login" />
    </AuthShell>
  );
}

