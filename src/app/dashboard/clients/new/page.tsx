import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientForm } from "./client-form";

export const metadata = { title: "Add Client" };
export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  const session = await auth();
  if (!session?.user?.businessId) redirect("/onboarding");

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-heading text-foreground">Add Client</h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/clients">Back</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ClientForm />
        </CardContent>
      </Card>
    </div>
  );
}

