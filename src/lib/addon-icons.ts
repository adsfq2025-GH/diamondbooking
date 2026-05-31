export const ADDON_ICON_OPTIONS = [
  { id: "apple", label: "Apple" },
  { id: "app-window", label: "Window" },
  { id: "blinds", label: "Blinds" },
  { id: "bug", label: "Bug" },
  { id: "clock", label: "Clock" },
  { id: "cooking-pot", label: "Oven / Stove" },
  { id: "door-closed", label: "Door" },
  { id: "droplets", label: "Droplets" },
  { id: "fence", label: "Fence" },
  { id: "fan", label: "Ceiling fan" },
  { id: "file-text", label: "File" },
  { id: "filter", label: "Filter" },
  { id: "flame", label: "Flame" },
  { id: "gem", label: "Gem" },
  { id: "home", label: "Home" },
  { id: "images", label: "Images" },
  { id: "leaf", label: "Leaf" },
  { id: "microwave", label: "Microwave" },
  { id: "package", label: "Package" },
  { id: "refrigerator", label: "Refrigerator" },
  { id: "repeat", label: "Repeat" },
  { id: "shower-head", label: "Shower" },
  { id: "scissors", label: "Scissors" },
  { id: "shield", label: "Shield" },
  { id: "sofa", label: "Carpet / upholstery" },
  { id: "spray-can", label: "Behind appliances" },
  { id: "sparkles", label: "Sparkles" },
  { id: "trees", label: "Trees" },
  { id: "truck", label: "Truck" },
  { id: "utensils", label: "Dishes" },
  { id: "warehouse", label: "Garage" },
  { id: "wind", label: "Wind" },
] as const;

export type AddOnIconId = (typeof ADDON_ICON_OPTIONS)[number]["id"];
export type AddOnIconOption = (typeof ADDON_ICON_OPTIONS)[number];

export function inferAddOnIconId(name: string): AddOnIconId | undefined {
  const n = name.toLowerCase();
  if (n.includes("ceiling fan") || n.includes("fan")) return "fan";
  if (n.includes("door")) return "door-closed";
  if (n.includes("garage")) return "warehouse";
  if (n.includes("shower") || n.includes("bath")) return "shower-head";
  if (n.includes("carpet") || n.includes("rug") || n.includes("upholstery") || n.includes("sofa")) return "sofa";
  if (n.includes("dish") || n.includes("dishes")) return "utensils";
  if (n.includes("behind") || n.includes("pull out") || n.includes("move")) return "spray-can";
  if (n.includes("fridge")) return "refrigerator";
  if (n.includes("microwave")) return "microwave";
  if (n.includes("oven")) return "cooking-pot";
  if (n.includes("stove")) return "cooking-pot";
  if (n.includes("window")) return "app-window";
  if (n.includes("blind")) return "blinds";
  if (n.includes("fence")) return "fence";
  if (n.includes("roof")) return "home";
  if (n.includes("vip")) return "gem";
  if (n.includes("image")) return "images";
  return undefined;
}

export function getAddOnIconOptionsForIndustry(industry: string) {
  const byId = new Map(ADDON_ICON_OPTIONS.map((o) => [o.id, o]));
  const pick = (ids: AddOnIconId[]) =>
    ids
      .map((id) => byId.get(id))
      .filter((x): x is AddOnIconOption => Boolean(x));

  if (industry === "cleaning_service" || industry === "janitorial_service") {
    return pick([
      "refrigerator",
      "microwave",
      "cooking-pot",
      "fan",
      "blinds",
      "app-window",
      "door-closed",
      "warehouse",
      "utensils",
      "shower-head",
      "sofa",
      "spray-can",
      "sparkles",
    ]);
  }

  if (industry === "carpet_cleaning") {
    return pick(["sofa", "sparkles", "spray-can", "truck"]);
  }

  if (industry === "window_cleaning") {
    return pick(["app-window", "blinds", "spray-can", "sparkles"]);
  }

  if (industry === "pressure_washing") {
    return pick(["droplets", "home", "fence", "spray-can", "sparkles"]);
  }

  if (industry === "plumbing") {
    return pick(["droplets", "filter", "home", "clock"]);
  }

  if (industry === "hvac") {
    return pick(["wind", "filter", "home", "clock"]);
  }

  if (industry === "pest_control") {
    return pick(["bug", "shield", "home", "repeat"]);
  }

  if (industry === "landscaping" || industry === "lawn_care" || industry === "tree_service") {
    return pick(["leaf", "trees", "truck", "fence", "scissors", "clock"]);
  }

  if (industry === "garage_door") {
    return pick(["door-closed", "warehouse", "home", "clock"]);
  }

  return ADDON_ICON_OPTIONS;
}
