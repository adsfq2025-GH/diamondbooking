export type IndustryTemplateConfig = {
  addOns: Array<{ key: string; name: string; price: number; extraMinutes?: number; iconId?: string }>;
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
  theme?: { accentColor?: string };
  ui?: { showIcons?: boolean; showLivePricing?: boolean };
};

export type IndustryTemplateSeed = {
  key: string;
  name: string;
  category: string;
  description?: string;
  sortOrder?: number;
  defaultConfig: IndustryTemplateConfig;
};

export function resolveIndustryTemplateKey(industry: string) {
  if (industry === "general_services") return "generic";
  if (industry === "cleaning_service" || industry === "janitorial_service") return "cleaning";
  if (industry === "jewelry_store") return "jewelry";
  return industry;
}

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
      ui: { showIcons: true, showLivePricing: true },
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
        { key: "inside_fridge", name: "Inside fridge", price: 25, iconId: "refrigerator" },
        { key: "inside_oven", name: "Inside oven", price: 30, iconId: "cooking-pot" },
        { key: "windows", name: "Interior windows", price: 40, iconId: "app-window" },
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
      ui: { showIcons: true, showLivePricing: true },
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
        { key: "fence", name: "Fence cleaning", price: 60, iconId: "fence" },
        { key: "roof", name: "Roof soft wash", price: 150, iconId: "home" },
      ],
      intakeFields: [
        { key: "customerType", label: "Residential or commercial?", type: "select", required: true, options: [{ value: "residential", label: "Residential" }, { value: "commercial", label: "Commercial" }] },
        { key: "drivewaySize", label: "Driveway size", type: "select", required: true, options: [{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }], pricing: { type: "choicePrice", prices: { small: 80, medium: 120, large: 160 } } },
        { key: "stories", label: "Number of stories", type: "select", required: true, options: [{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3+" }], pricing: { type: "choicePrice", prices: { "1": 0, "2": 40, "3": 80 } } },
      ],
      customerTypes: { enabled: true, options: ["residential", "commercial"], commercialMultiplier: 1.2 },
      recurring: { enabled: false, intervals: [] },
      ui: { showIcons: true, showLivePricing: true },
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
      ui: { showIcons: true, showLivePricing: true },
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
        { key: "extra_images", name: "Extra images package", price: 25, iconId: "images" },
      ],
      intakeFields: [
        { key: "scanType", label: "Scan type", type: "select", required: true, options: [{ value: "basic", label: "Basic scan" }, { value: "3d4d", label: "3D/4D scan" }], pricing: { type: "choicePrice", prices: { basic: 0, "3d4d": 60 } } },
        { key: "pregnancyStage", label: "Pregnancy stage (weeks)", type: "number" },
        { key: "selfPay", label: "Self-pay", type: "boolean" },
      ],
      customerTypes: { enabled: false, options: ["residential", "commercial"] },
      recurring: { enabled: false, intervals: [] },
      ui: { showIcons: true, showLivePricing: true },
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
      ui: { showIcons: true, showLivePricing: true },
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
        { key: "vip", name: "VIP priority slot", price: 30, iconId: "gem" },
      ],
      intakeFields: [
        { key: "serviceType", label: "Service type", type: "select", required: true, options: [{ value: "repair", label: "Jewelry repair" }, { value: "ring_sizing", label: "Ring sizing" }, { value: "custom_design", label: "Custom design consultation" }, { value: "watch_battery", label: "Watch battery replacement" }], pricing: { type: "choicePrice", prices: { repair: 0, ring_sizing: 20, custom_design: 0, watch_battery: 15 } } },
      ],
      customerTypes: { enabled: false, options: ["residential", "commercial"] },
      recurring: { enabled: false, intervals: [] },
      ui: { showIcons: true, showLivePricing: true },
    },
  },
  {
    key: "carpet_cleaning",
    name: "Carpet Cleaning",
    category: "Home Services",
    description: "Room-count pricing with optional treatments.",
    sortOrder: 12,
    defaultConfig: {
      addOns: [
        { key: "pet_treatment", name: "Pet odor treatment", price: 35, iconId: "sparkles" },
        { key: "stain_protect", name: "Stain protection", price: 25, iconId: "shield" },
      ],
      intakeFields: [
        { key: "rooms", label: "Rooms", type: "number", required: true, pricing: { type: "perUnit", unitPrice: 45 } },
        { key: "stairs", label: "Stairs", type: "number", pricing: { type: "perUnit", unitPrice: 6 } },
        { key: "furniture", label: "Move light furniture", type: "boolean", pricing: { type: "choicePrice", prices: { true: 20, false: 0 } } },
      ],
      customerTypes: { enabled: true, options: ["residential", "commercial"], commercialMultiplier: 1.2 },
      recurring: { enabled: false, intervals: [] },
      ui: { showIcons: true, showLivePricing: true },
    },
  },
  {
    key: "window_cleaning",
    name: "Window Cleaning",
    category: "Home Services",
    description: "Window-count pricing with story/height adjustments.",
    sortOrder: 14,
    defaultConfig: {
      addOns: [
        { key: "screens", name: "Screen cleaning", price: 20, iconId: "app-window" },
        { key: "tracks", name: "Track detailing", price: 25, iconId: "app-window" },
      ],
      intakeFields: [
        { key: "windows", label: "Number of windows", type: "number", required: true, pricing: { type: "perUnit", unitPrice: 12 } },
        { key: "stories", label: "Number of stories", type: "select", required: true, options: [{ value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3+" }], pricing: { type: "choicePrice", prices: { "1": 0, "2": 25, "3": 50 } } },
      ],
      customerTypes: { enabled: true, options: ["residential", "commercial"], commercialMultiplier: 1.25 },
      recurring: { enabled: false, intervals: [] },
      ui: { showIcons: true, showLivePricing: true },
    },
  },
  {
    key: "hvac",
    name: "HVAC",
    category: "Home Services",
    description: "Tune-ups, repairs, and estimates with after-hours options.",
    sortOrder: 32,
    defaultConfig: {
      addOns: [
        { key: "after_hours", name: "After-hours service", price: 85, iconId: "clock" },
        { key: "filter", name: "Replace air filter", price: 25, iconId: "wind" },
      ],
      intakeFields: [
        { key: "serviceType", label: "Service type", type: "select", required: true, options: [{ value: "tuneup", label: "Tune-up" }, { value: "repair", label: "Repair" }, { value: "estimate", label: "Replacement estimate" }], pricing: { type: "choicePrice", prices: { tuneup: 0, repair: 0, estimate: 0 } } },
        { key: "systems", label: "Number of systems", type: "number", required: true, pricing: { type: "perUnit", unitPrice: 40 } },
        { key: "no_cool", label: "No cool / no heat", type: "boolean", pricing: { type: "choicePrice", prices: { true: 35, false: 0 } } },
      ],
      customerTypes: { enabled: true, options: ["residential", "commercial"], commercialMultiplier: 1.2 },
      recurring: { enabled: false, intervals: [] },
      ui: { showIcons: true, showLivePricing: true },
    },
  },
  {
    key: "electrical",
    name: "Electrical",
    category: "Home Services",
    description: "Job-type selection with per-item pricing and emergency surcharge.",
    sortOrder: 34,
    defaultConfig: {
      addOns: [
        { key: "permit", name: "Permit handling", price: 45, iconId: "file-text" },
      ],
      intakeFields: [
        { key: "jobType", label: "Job type", type: "select", required: true, options: [{ value: "outlet", label: "Outlet / switch" }, { value: "light", label: "Light fixture" }, { value: "panel", label: "Panel / breaker" }, { value: "troubleshoot", label: "Troubleshooting" }], pricing: { type: "choicePrice", prices: { outlet: 0, light: 0, panel: 50, troubleshoot: 0 } } },
        { key: "items", label: "How many items?", type: "number", required: true, pricing: { type: "perUnit", unitPrice: 65 } },
        { key: "emergency", label: "Emergency service", type: "boolean", pricing: { type: "choicePrice", prices: { true: 95, false: 0 } } },
      ],
      customerTypes: { enabled: true, options: ["residential", "commercial"], commercialMultiplier: 1.15 },
      recurring: { enabled: false, intervals: [] },
      ui: { showIcons: true, showLivePricing: true },
    },
  },
  {
    key: "handyman",
    name: "Handyman",
    category: "Home Services",
    description: "Hourly-style estimates with task type intake.",
    sortOrder: 36,
    defaultConfig: {
      addOns: [
        { key: "materials", name: "Materials pickup", price: 25, iconId: "package" },
      ],
      intakeFields: [
        { key: "taskType", label: "What do you need help with?", type: "select", required: true, options: [{ value: "mount", label: "TV / mount" }, { value: "assembly", label: "Furniture assembly" }, { value: "patch", label: "Patch / repair" }, { value: "misc", label: "Miscellaneous" }] },
        { key: "timeEstimate", label: "Estimated time", type: "select", required: true, options: [{ value: "1", label: "Up to 1 hour" }, { value: "2", label: "1–2 hours" }, { value: "4", label: "Half day" }], pricing: { type: "choicePrice", prices: { "1": 95, "2": 165, "4": 320 } } },
      ],
      customerTypes: { enabled: true, options: ["residential", "commercial"], commercialMultiplier: 1.15 },
      recurring: { enabled: false, intervals: [] },
      ui: { showIcons: true, showLivePricing: true },
    },
  },
  {
    key: "pest_control",
    name: "Pest Control",
    category: "Home Services",
    description: "Property-size pricing with pest type selection.",
    sortOrder: 38,
    defaultConfig: {
      addOns: [
        { key: "rodent", name: "Rodent bait stations", price: 45, iconId: "bug" },
        { key: "followup", name: "Follow-up visit", price: 35, iconId: "repeat" },
      ],
      intakeFields: [
        { key: "pestType", label: "Pest type", type: "select", required: true, options: [{ value: "ants", label: "Ants" }, { value: "roaches", label: "Roaches" }, { value: "spiders", label: "Spiders" }, { value: "rodents", label: "Rodents" }, { value: "other", label: "Other" }] },
        { key: "propertySize", label: "Property size", type: "select", required: true, options: [{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }], pricing: { type: "choicePrice", prices: { small: 95, medium: 125, large: 160 } } },
      ],
      customerTypes: { enabled: true, options: ["residential", "commercial"], commercialMultiplier: 1.2 },
      recurring: { enabled: true, intervals: [{ key: "monthly", label: "Monthly", discountPercent: 10 }, { key: "quarterly", label: "Quarterly", discountPercent: 5 }] },
      ui: { showIcons: true, showLivePricing: true },
    },
  },
  {
    key: "landscaping",
    name: "Landscaping",
    category: "Home Services",
    description: "Yard-size pricing with common landscaping add-ons.",
    sortOrder: 40,
    defaultConfig: {
      addOns: [
        { key: "haul_away", name: "Debris haul-away", price: 65, iconId: "truck" },
        { key: "mulch", name: "Mulch delivery", price: 85, iconId: "leaf" },
      ],
      intakeFields: [
        { key: "yardSize", label: "Yard size", type: "select", required: true, options: [{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }], pricing: { type: "choicePrice", prices: { small: 120, medium: 180, large: 260 } } },
        { key: "serviceType", label: "Service type", type: "select", required: true, options: [{ value: "cleanup", label: "Cleanup" }, { value: "maintenance", label: "Maintenance" }, { value: "install", label: "New install" }] },
      ],
      customerTypes: { enabled: true, options: ["residential", "commercial"], commercialMultiplier: 1.25 },
      recurring: { enabled: true, intervals: [{ key: "weekly", label: "Weekly", discountPercent: 10 }, { key: "biweekly", label: "Biweekly", discountPercent: 7 }] },
      ui: { showIcons: true, showLivePricing: true },
    },
  },
  {
    key: "lawn_care",
    name: "Lawn Care",
    category: "Home Services",
    description: "Lawn-size pricing with edging and trimming add-ons.",
    sortOrder: 42,
    defaultConfig: {
      addOns: [
        { key: "edging", name: "Edging", price: 15, iconId: "scissors" },
        { key: "bush_trim", name: "Bush trimming", price: 25, iconId: "leaf" },
      ],
      intakeFields: [
        { key: "lawnSize", label: "Lawn size", type: "select", required: true, options: [{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }], pricing: { type: "choicePrice", prices: { small: 45, medium: 65, large: 90 } } },
      ],
      customerTypes: { enabled: true, options: ["residential", "commercial"], commercialMultiplier: 1.25 },
      recurring: { enabled: true, intervals: [{ key: "weekly", label: "Weekly", discountPercent: 10 }, { key: "biweekly", label: "Biweekly", discountPercent: 7 }] },
      ui: { showIcons: true, showLivePricing: true },
    },
  },
  {
    key: "tree_service",
    name: "Tree Service",
    category: "Home Services",
    description: "Tree-count pricing with service type selection.",
    sortOrder: 44,
    defaultConfig: {
      addOns: [
        { key: "haul_away", name: "Haul away", price: 75, iconId: "truck" },
        { key: "stump", name: "Stump grinding", price: 120, iconId: "trees" },
      ],
      intakeFields: [
        { key: "treeCount", label: "Tree count", type: "number", required: true, pricing: { type: "perUnit", unitPrice: 140 } },
        { key: "serviceType", label: "Service type", type: "select", required: true, options: [{ value: "trim", label: "Trim" }, { value: "remove", label: "Removal" }, { value: "stump", label: "Stump grinding" }], pricing: { type: "choicePrice", prices: { trim: 0, remove: 80, stump: 0 } } },
      ],
      customerTypes: { enabled: true, options: ["residential", "commercial"], commercialMultiplier: 1.25 },
      recurring: { enabled: false, intervals: [] },
      ui: { showIcons: true, showLivePricing: true },
    },
  },
  {
    key: "pool_service",
    name: "Pool Service",
    category: "Home Services",
    description: "Visit-type pricing with optional chemical balancing.",
    sortOrder: 46,
    defaultConfig: {
      addOns: [
        { key: "chemicals", name: "Chemical balancing", price: 35, iconId: "droplets" },
        { key: "filter_clean", name: "Filter cleaning", price: 45, iconId: "filter" },
      ],
      intakeFields: [
        { key: "visitType", label: "Visit type", type: "select", required: true, options: [{ value: "standard", label: "Standard service" }, { value: "deep", label: "Deep clean" }, { value: "opening", label: "Seasonal opening" }, { value: "closing", label: "Seasonal closing" }], pricing: { type: "choicePrice", prices: { standard: 0, deep: 55, opening: 80, closing: 80 } } },
        { key: "poolType", label: "Pool type", type: "select", required: true, options: [{ value: "in_ground", label: "In-ground" }, { value: "above_ground", label: "Above-ground" }] },
      ],
      customerTypes: { enabled: true, options: ["residential", "commercial"], commercialMultiplier: 1.3 },
      recurring: { enabled: true, intervals: [{ key: "weekly", label: "Weekly", discountPercent: 10 }, { key: "biweekly", label: "Biweekly", discountPercent: 7 }] },
      ui: { showIcons: true, showLivePricing: true },
    },
  },
  {
    key: "salon",
    name: "Hair Salon",
    category: "Beauty",
    description: "Service selection with optional add-ons.",
    sortOrder: 70,
    defaultConfig: {
      addOns: [
        { key: "deep_condition", name: "Deep conditioning", price: 20, iconId: "sparkles" },
        { key: "blowout", name: "Blowout", price: 25, iconId: "wind" },
      ],
      intakeFields: [
        { key: "service", label: "Service", type: "select", required: true, options: [{ value: "cut", label: "Cut" }, { value: "color", label: "Color" }, { value: "cut_color", label: "Cut + Color" }, { value: "highlights", label: "Highlights" }], pricing: { type: "choicePrice", prices: { cut: 0, color: 35, cut_color: 55, highlights: 75 } } },
      ],
      customerTypes: { enabled: false, options: ["residential", "commercial"] },
      recurring: { enabled: false, intervals: [] },
      ui: { showIcons: true, showLivePricing: true },
    },
  },
  {
    key: "massage",
    name: "Massage Therapy",
    category: "Wellness",
    description: "Duration-based pricing with optional upgrades.",
    sortOrder: 72,
    defaultConfig: {
      addOns: [
        { key: "hot_stones", name: "Hot stones", price: 20, iconId: "flame" },
        { key: "aromatherapy", name: "Aromatherapy", price: 10, iconId: "leaf" },
      ],
      intakeFields: [
        { key: "duration", label: "Duration", type: "select", required: true, options: [{ value: "60", label: "60 minutes" }, { value: "90", label: "90 minutes" }], pricing: { type: "choicePrice", prices: { "60": 0, "90": 35 } } },
        { key: "focus", label: "Focus area", type: "select", required: false, options: [{ value: "full", label: "Full body" }, { value: "back", label: "Back & neck" }, { value: "sports", label: "Sports recovery" }] },
      ],
      customerTypes: { enabled: false, options: ["residential", "commercial"] },
      recurring: { enabled: false, intervals: [] },
      ui: { showIcons: true, showLivePricing: true },
    },
  },
  {
    key: "fitness",
    name: "Fitness & Personal Training",
    category: "Wellness",
    description: "Session type + package selection.",
    sortOrder: 74,
    defaultConfig: {
      addOns: [
        { key: "nutrition", name: "Nutrition plan", price: 35, iconId: "apple" },
      ],
      intakeFields: [
        { key: "sessionType", label: "Session type", type: "select", required: true, options: [{ value: "in_person", label: "In-person" }, { value: "virtual", label: "Virtual" }] },
        { key: "package", label: "Package", type: "select", required: true, options: [{ value: "single", label: "Single session" }, { value: "5", label: "5 sessions" }, { value: "10", label: "10 sessions" }], pricing: { type: "choicePrice", prices: { single: 0, "5": -25, "10": -60 } } },
      ],
      customerTypes: { enabled: false, options: ["residential", "commercial"] },
      recurring: { enabled: true, intervals: [{ key: "weekly", label: "Weekly", discountPercent: 10 }, { key: "biweekly", label: "Biweekly", discountPercent: 7 }] },
      ui: { showIcons: true, showLivePricing: true },
    },
  },
];
