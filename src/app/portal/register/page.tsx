import { AuthShell } from "@/components/auth/auth-shell";
import Link from "next/link";
import { EnvironmentChooser } from "@/components/tenant/environment-chooser";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Create Client Account — Diamond Booking" };
export const dynamic = "force-dynamic";

export default async function PortalRegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/post-login");

  return (
    <AuthShell
      title="Create client account"
      subtitle="Enter your business slug to create your account."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/portal/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <EnvironmentChooser area="portal" action="register" />
    </AuthShell>
  );
}
