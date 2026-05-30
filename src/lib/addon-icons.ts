export const ADDON_ICON_OPTIONS = [
  { id: "apple", label: "Apple" },
  { id: "app-window", label: "Window" },
  { id: "blinds", label: "Blinds" },
  { id: "bug", label: "Bug" },
  { id: "clock", label: "Clock" },
  { id: "cooking-pot", label: "Cooking pot" },
  { id: "droplets", label: "Droplets" },
  { id: "fence", label: "Fence" },
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
  { id: "scissors", label: "Scissors" },
  { id: "shield", label: "Shield" },
  { id: "sparkles", label: "Sparkles" },
  { id: "trees", label: "Trees" },
  { id: "truck", label: "Truck" },
  { id: "wind", label: "Wind" },
] as const;

export type AddOnIconId = (typeof ADDON_ICON_OPTIONS)[number]["id"];

export function inferAddOnIconId(name: string): AddOnIconId | undefined {
  const n = name.toLowerCase();
  if (n.includes("fridge")) return "refrigerator";
  if (n.includes("microwave")) return "microwave";
  if (n.includes("oven")) return "cooking-pot";
  if (n.includes("window")) return "app-window";
  if (n.includes("blind")) return "blinds";
  if (n.includes("fence")) return "fence";
  if (n.includes("roof")) return "home";
  if (n.includes("vip")) return "gem";
  if (n.includes("image")) return "images";
  return undefined;
}

