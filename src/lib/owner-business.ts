import { prisma } from "@/lib/prisma";

export async function resolveOwnerBusinessId(ownerId: string, preferredBusinessId?: string | null) {
  if (preferredBusinessId) {
    const preferred = await prisma.business.findUnique({
      where: { id: preferredBusinessId },
      select: { id: true },
    });
    if (preferred) return preferred.id;
  }

  const owned = await prisma.business.findFirst({
    where: { ownerId },
    select: { id: true },
  });

  return owned?.id ?? null;
}
