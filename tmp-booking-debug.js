const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const bookings = await prisma.booking.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { business: { select: { name: true, slug: true, timezone: true } }, customer: { select: { email: true, name: true } } },
  });
  for (const b of bookings) {
    console.log(JSON.stringify({
      id: b.id,
      business: b.business,
      customer: b.customer,
      date: b.date,
      startTimeIso: b.startTime.toISOString(),
      endTimeIso: b.endTime.toISOString(),
      status: b.status,
      source: b.source,
      createdAt: b.createdAt.toISOString(),
    }, null, 2));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
