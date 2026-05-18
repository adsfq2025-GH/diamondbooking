// prisma/seed.ts
// Run: npx prisma db seed

import { PrismaClient, Role, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { INDUSTRY_TEMPLATES } from "../src/lib/industry/templates";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Diamond Booking seed...\n");

  // ──────────────────────────────────────────
  // 1. SUPER ADMIN
  // ──────────────────────────────────────────
  const adminEmail = process.env.SUPER_ADMIN_EMAIL;
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "❌ SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in .env"
    );
  }

  const normalizedAdminEmail = adminEmail.toLowerCase();

  const existingByEmail = await prisma.user.findUnique({
    where: { email: normalizedAdminEmail },
    select: { id: true, email: true, role: true },
  });

  if (existingByEmail && existingByEmail.role !== Role.SUPER_ADMIN) {
    throw new Error(
      `❌ SUPER_ADMIN_EMAIL (${normalizedAdminEmail}) already exists as role ${existingByEmail.role}. Use a dedicated admin email (recommended) or manually change the user's role to SUPER_ADMIN.`
    );
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN },
  });

  if (existingAdmin) {
    console.log(`✅ Super Admin already exists: ${existingAdmin.email}`);
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
      data: {
        email: normalizedAdminEmail,
        name: "Platform Admin",
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        emailVerified: new Date(),
        isActive: true,
      },
    });
    console.log(`✅ Super Admin created: ${admin.email}`);
  }

  // ──────────────────────────────────────────
  // 2. PLATFORM SETTINGS
  // ──────────────────────────────────────────
  await prisma.platformSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      platformName: "Diamond Booking",
      supportEmail: adminEmail,
      maintenanceMode: false,
      defaultTrialDays: 14,
    },
  });
  console.log("✅ Platform settings initialized");

  // ──────────────────────────────────────────
  // 3. SUBSCRIPTION PLANS
  // ──────────────────────────────────────────
  const plans = [
    {
      plan: SubscriptionPlan.FREE,
      displayName: "Free",
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      priceMonthly: 0,
      priceYearly: 0,
      maxStaff: 1,
      maxServices: 3,
      maxBookingsPerMonth: 20,
      removesBranding: false,
      emailReminders: false,
      customDomain: false,
      apiAccess: false,
      prioritySupport: false,
      features: [
        "1 staff member",
        "3 services",
        "20 bookings/month",
        "Public booking page",
        "Email confirmations",
        "Diamond Booking branding",
      ],
      sortOrder: 0,
    },
    {
      plan: SubscriptionPlan.STARTER,
      displayName: "Starter",
      stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || null,
      stripePriceIdYearly: process.env.STRIPE_PRICE_STARTER_YEARLY || null,
      priceMonthly: 29,
      priceYearly: 290, // 2 months free
      maxStaff: 3,
      maxServices: 10,
      maxBookingsPerMonth: 100,
      removesBranding: true,
      emailReminders: false,
      customDomain: false,
      apiAccess: false,
      prioritySupport: false,
      features: [
        "3 staff members",
        "10 services",
        "100 bookings/month",
        "Remove Diamond Booking branding",
        "Email confirmations",
        "Client database",
        "Basic analytics",
      ],
      sortOrder: 1,
    },
    {
      plan: SubscriptionPlan.PROFESSIONAL,
      displayName: "Professional",
      stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || null,
      stripePriceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY || null,
      priceMonthly: 59,
      priceYearly: 590,
      maxStaff: 10,
      maxServices: -1, // unlimited
      maxBookingsPerMonth: -1, // unlimited
      removesBranding: true,
      emailReminders: true,
      customDomain: false,
      apiAccess: false,
      prioritySupport: true,
      features: [
        "10 staff members",
        "Unlimited services",
        "Unlimited bookings",
        "24h email reminders",
        "Advanced analytics",
        "Priority support",
        "Custom booking page colors",
      ],
      sortOrder: 2,
    },
    {
      plan: SubscriptionPlan.ENTERPRISE,
      displayName: "Enterprise",
      stripePriceIdMonthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || null,
      stripePriceIdYearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || null,
      priceMonthly: 119,
      priceYearly: 1190,
      maxStaff: -1,
      maxServices: -1,
      maxBookingsPerMonth: -1,
      removesBranding: true,
      emailReminders: true,
      customDomain: true,
      apiAccess: true,
      prioritySupport: true,
      features: [
        "Unlimited staff",
        "Unlimited services",
        "Unlimited bookings",
        "Custom domain support",
        "API access",
        "Dedicated account manager",
        "SLA guarantee",
        "White-label options",
      ],
      sortOrder: 3,
    },
  ];

  for (const plan of plans) {
    await prisma.planConfig.upsert({
      where: { plan: plan.plan },
      update: {
        displayName: plan.displayName,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        maxStaff: plan.maxStaff,
        maxServices: plan.maxServices,
        maxBookingsPerMonth: plan.maxBookingsPerMonth,
        removesBranding: plan.removesBranding,
        emailReminders: plan.emailReminders,
        customDomain: plan.customDomain,
        apiAccess: plan.apiAccess,
        prioritySupport: plan.prioritySupport,
        features: plan.features,
        sortOrder: plan.sortOrder,
      },
      create: plan,
    });
    console.log(`✅ Plan seeded: ${plan.displayName} ($${plan.priceMonthly}/mo)`);
  }

  // ──────────────────────────────────────────
  // 4. INDUSTRY TEMPLATES
  // ──────────────────────────────────────────
  for (const tpl of INDUSTRY_TEMPLATES) {
    await prisma.industryTemplate.upsert({
      where: { key: tpl.key },
      update: {
        name: tpl.name,
        category: tpl.category,
        description: tpl.description ?? null,
        defaultConfig: tpl.defaultConfig as unknown as object,
        isActive: true,
        sortOrder: tpl.sortOrder ?? 0,
      },
      create: {
        key: tpl.key,
        name: tpl.name,
        category: tpl.category,
        description: tpl.description ?? null,
        defaultConfig: tpl.defaultConfig as unknown as object,
        isActive: true,
        sortOrder: tpl.sortOrder ?? 0,
      },
    });
  }
  console.log(`✅ Industry templates initialized (${INDUSTRY_TEMPLATES.length})`);

  // Ensure every business has a config row
  const businesses = await prisma.business.findMany({ select: { id: true, industry: true } });
  for (const b of businesses) {
    const industryKey = b.industry && typeof b.industry === "string" ? b.industry : "generic";
    const template = INDUSTRY_TEMPLATES.find((t) => t.key === industryKey) ?? INDUSTRY_TEMPLATES[0];
    await prisma.businessConfig.upsert({
      where: { businessId: b.id },
      update: { industryKey: template.key },
      create: { businessId: b.id, industryKey: template.key, config: template.defaultConfig as unknown as object },
    });
  }
  console.log("✅ Business configs initialized");

  // ──────────────────────────────────────────
  // 5. DEMO DATA (optional — comment out for production)
  // Creates 3 sample businesses so the Super Admin dashboard has data
  // ──────────────────────────────────────────
  if (process.env.SEED_DEMO_DATA === "true") {
    await seedDemoData();
  }

  console.log("\n🎉 Seed completed successfully!");
  const authBaseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "";
  console.log(`\n📌 Login at: ${authBaseUrl}/auth/login`);
  console.log(`   Email:    ${normalizedAdminEmail}`);
  console.log(`   Password: [as set in SUPER_ADMIN_PASSWORD]`);
  console.log(`   Redirect after login: /superadmin (SUPER_ADMIN role only)`);
}

async function seedDemoData() {
  console.log("\n📦 Seeding demo data...");

  const demos = [
    {
      name: "Glow Beauty Studio",
      industry: "salon",
      city: "New York",
      email: "owner1@demo.com",
      plan: SubscriptionPlan.PROFESSIONAL,
    },
    {
      name: "FitZone Training",
      industry: "fitness",
      city: "Los Angeles",
      email: "owner2@demo.com",
      plan: SubscriptionPlan.STARTER,
    },
    {
      name: "The Grooming Room",
      industry: "barbershop",
      city: "Chicago",
      email: "owner3@demo.com",
      plan: SubscriptionPlan.FREE,
    },
  ];

  for (const demo of demos) {
    const hashedPassword = await bcrypt.hash("Demo1234!", 12);
    const slug = demo.name.toLowerCase().replace(/[^a-z0-9]/g, "-");

    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: {},
      create: {
        email: demo.email,
        name: `${demo.name} Owner`,
        password: hashedPassword,
        role: Role.OWNER,
        emailVerified: new Date(),
        isActive: true,
      },
    });

    const business = await prisma.business.upsert({
      where: { ownerId: user.id },
      update: {},
      create: {
        ownerId: user.id,
        name: demo.name,
        slug,
        industry: demo.industry,
        city: demo.city,
        country: "US",
        timezone: "America/New_York",
        onboardingComplete: true,
        isActive: true,
      },
    });

    // Default business hours (Mon-Sat 9-6, Sun closed)
    for (let day = 0; day <= 6; day++) {
      await prisma.businessHours.upsert({
        where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek: day } },
        update: {},
        create: {
          businessId: business.id,
          dayOfWeek: day,
          openTime: "09:00",
          closeTime: "18:00",
          isClosed: day === 0, // Sunday closed
        },
      });
    }

    // Sample services
    const serviceData = [
      { name: "Consultation", duration: 30, price: 0 },
      { name: "Full Session", duration: 60, price: 75 },
      { name: "Express Session", duration: 30, price: 45 },
    ];

    const services = await Promise.all(
      serviceData.map((s) =>
        prisma.service.create({
          data: { ...s, businessId: business.id },
        })
      )
    );

    // Sample staff
    const staff = await prisma.staff.create({
      data: {
        businessId: business.id,
        name: "Alex Johnson",
        email: `alex@${slug}.com`,
        isActive: true,
        services: {
          create: services.map((s) => ({ serviceId: s.id })),
        },
      },
    });

    // Subscription
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        plan: demo.plan,
        status: demo.plan === SubscriptionPlan.FREE
          ? SubscriptionStatus.ACTIVE
          : SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Sample customer + booking
    const customer = await prisma.customer.create({
      data: {
        businessId: business.id,
        name: "Jane Smith",
        email: "jane.smith@example.com",
        phone: "555-0100",
      },
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    await prisma.booking.create({
      data: {
        businessId: business.id,
        serviceId: services[1].id,
        staffId: staff.id,
        customerId: customer.id,
        date: tomorrow,
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000),
        status: "CONFIRMED",
        totalPrice: services[1].price,
        source: "booking_page",
      },
    });

    console.log(`   ✅ Demo business: ${demo.name} (${demo.email})`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
