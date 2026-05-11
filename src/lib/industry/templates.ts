export type IndustryTemplateConfig = {
  addOns: Array<{ key: string; name: string; price: number; extraMinutes?: number }>;
  intakeFields: Array<{
    key: string;
    label: string;
    type: "text" | "number" | "select" | "boolean";
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
    pricing?: { type: "perUnit" | "choicePrice"; unitPrice?: number; prices?: Record<string, number> };
  }>;
  customerTypes?: {
    enabled: boolean;
    options: Array<"residential" | "commercial">;
    commercialMultiplier?: number;
  };
  recurring?: {
    enabled: boolean;
    intervals: Array<{ key: string; label: string; discountPercent: number }>;
  };
};

export type IndustryTemplateSeed = {
  key: string;
  name: string;
  category: string;
  description?: string;
  sortOrder?: number;
  defaultConfig: IndustryTemplateConfig;
};

export const INDUSTRY_TEMPLATES: IndustryTemplateSeed[] = [
  {
    key: "generic",
    name: "General Services",
    category: "General",
    description: "A flexible setup that works for most appointment-based services.",
    sortOrder: 0,
    defaultConfig: {
      addOns: [],
      intakeFields: [
        { key: "details", label: "What can we help with?", type: "text" },
      ],
      customerTypes: { enabled: false, options: ["residential", "commercial"] },
      recurring: { enabled: false, intervals: [] },
    },
  },
  {
    key: "cleaning",
    name: "Cleaning Company",
    category: "Home Services",
    description: "Residential & commercial cleaning with room-count pricing and add-ons.",
    sortOrder: 10,
    defaultConfig: {
      addOns: [
        { key: "inside_fridge", name: "Inside fridge", price: 25 },
        { key: "inside_oven", name: "Inside oven", price: 30 },
        { key: "windows", name: "Interior windows", price: 40 },
      ],
      intakeFields: [
        { key: "customerType", label: "Residential or commercial?", type: "select", required: true, options: [{ value: "residential", label: "Residential" }, { value: "commercial", label: "Commercial" }] },
        { key: "bedrooms", label: "Bedrooms", type: "number", required: true, pricing: { type: "perUnit", unitPrice: 30 } },
        { key: "bathrooms", label: "Bathrooms", type: "number", required: true, pricing: { type: "perUnit", unitPrice: 25 } },
        { key: "squareFeet", label: "Square footage", type: "number", pricing: { type: "perUnit", unitPrice: 0.06 } },
        { key: "cleanType", label: "Cleaning type", type: "select", required: true, options: [{ value: "standard", label: "Standard" }, { value: "deep", label: "Deep clean" }], pricing: { type: "choicePrice", prices: { standard: 0, deep: 80 } } },
      ],
      customerTypes: { enabled: true, options: ["residential", "commercial"], commercialMultiplier: 1.25 },
      recurring: {
        enabled: true,
        intervals: [
          { key: "monthly", label: "Once per month", discountPercent: 10 },
          { key: "biweekly", label: "Twice per month", discountPercent: 15 },
          { key: "weekly", label: "Once per week", discountPercent: 20 },
        ],
      },
    },
  },
  {
    key: "pressure_washing",
    name: "Pressure Washing",
    category: "Home Services",
    description: "Per-surface + size-based pricing with common add-ons.",
    sortOrder: 20,
    defaultConfig: {
      addOns: [
        { key: "fence", name: "Fence cleaning", price: 60 },
        { key: "roof", name: "Roof soft wash", price: 150 },
      ],
      intakeFields: [
        { key: "customerType", label: "Residential or commercial?", type: "select", required: true, options: [{ value: "residential", label: "Residential" }, { value: "commercial", label: "Commercial" }] },
        { key: "drivewaySize", label: "Driveway size", type: "select", required: true, options: [{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }], pricing: { type: "choicePrice", prices: { small: 80, medium: 120, large: 160 } } },
        { key: "stories", label: "Number of stories", type: "select", required: true, options: [{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3+" }], pricing: { type: "choicePrice", prices: { "1": 0, "2": 40, "3": 80 } } },
      ],
      customerTypes: { enabled: true, options: ["residential", "commercial"], commercialMultiplier: 1.2 },
      recurring: { enabled: false, intervals: [] },
    },
  },
  {
    key: "plumbing",
    name: "Plumbing",
    category: "Home Services",
    description: "Fixture-based pricing with optional emergency surcharge.",
    sortOrder: 30,
    defaultConfig: {
      addOns: [],
      intakeFields: [
        { key: "customerType", label: "Residential or commercial?", type: "select", required: true, options: [{ value: "residential", label: "Residential" }, { value: "commercial", label: "Commercial" }] },
        { key: "fixtureType", label: "Fixture type", type: "select", required: true, options: [{ value: "faucet", label: "Faucet" }, { value: "toilet", label: "Toilet" }, { value: "water_heater", label: "Water heater" }, { value: "drain", label: "Drain / clog" }] },
        { key: "fixtureCount", label: "Number of fixtures", type: "number", required: true, pricing: { type: "perUnit", unitPrice: 85 } },
        { key: "emergency", label: "Emergency service", type: "boolean", pricing: { type: "choicePrice", prices: { true: 75, false: 0 } } },
      ],
      customerTypes: { enabled: true, options: ["residential", "commercial"], commercialMultiplier: 1.15 },
      recurring: { enabled: false, intervals: [] },
    },
  },
  {
    key: "ultrasound",
    name: "Ultrasound Clinic",
    category: "Medical & Health",
    description: "Scan-type pricing with optional packages and duration adjustments.",
    sortOrder: 40,
    defaultConfig: {
      addOns: [
        { key: "extra_images", name: "Extra images package", price: 25 },
      ],
      intakeFields: [
        { key: "scanType", label: "Scan type", type: "select", required: true, options: [{ value: "basic", label: "Basic scan" }, { value: "3d4d", label: "3D/4D scan" }], pricing: { type: "choicePrice", prices: { basic: 0, "3d4d": 60 } } },
        { key: "pregnancyStage", label: "Pregnancy stage (weeks)", type: "number" },
        { key: "selfPay", label: "Self-pay", type: "boolean" },
      ],
      customerTypes: { enabled: false, options: ["residential", "commercial"] },
      recurring: { enabled: false, intervals: [] },
    },
  },
  {
    key: "dental",
    name: "Dental Clinic",
    category: "Medical & Health",
    description: "Appointment type intake with optional insurance and follow-ups.",
    sortOrder: 50,
    defaultConfig: {
      addOns: [],
      intakeFields: [
        { key: "appointmentType", label: "Appointment type", type: "select", required: true, options: [{ value: "cleaning", label: "Cleaning" }, { value: "consult", label: "Consultation" }, { value: "emergency", label: "Emergency visit" }], pricing: { type: "choicePrice", prices: { cleaning: 0, consult: 40, emergency: 80 } } },
        { key: "insuranceProvider", label: "Insurance provider (optional)", type: "text" },
      ],
      customerTypes: { enabled: false, options: ["residential", "commercial"] },
      recurring: { enabled: false, intervals: [] },
    },
  },
  {
    key: "jewelry",
    name: "Jewelry Store",
    category: "Retail & Luxury",
    description: "Repair and consultation bookings with VIP options.",
    sortOrder: 60,
    defaultConfig: {
      addOns: [
        { key: "vip", name: "VIP priority slot", price: 30 },
      ],
      intakeFields: [
        { key: "serviceType", label: "Service type", type: "select", required: true, options: [{ value: "repair", label: "Jewelry repair" }, { value: "ring_sizing", label: "Ring sizing" }, { value: "custom_design", label: "Custom design consultation" }, { value: "watch_battery", label: "Watch battery replacement" }], pricing: { type: "choicePrice", prices: { repair: 0, ring_sizing: 20, custom_design: 0, watch_battery: 15 } } },
      ],
      customerTypes: { enabled: false, options: ["residential", "commercial"] },
      recurring: { enabled: false, intervals: [] },
    },
  },
];
