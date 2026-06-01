export const EQUIPMENT_TYPES = [
  "Dozer",
  "Excavator",
  "Loader",
  "Skid Steer",
  "Roller",
  "Water Truck",
  "Fuel Truck",
  "Service Truck",
  "Quad Axle Dump Truck",
  "Triaxle Dump Truck",
  "Dump Truck",
  "Lowboy Truck",
  "Lowboy Trailer",
  "Lowboy Truck and Trailer",
  "Grader",
  "Scraper",
  "Compactor",
  "Backhoe",
  "Mini Excavator",
  "Telehandler",
  "Rental",
  "Other"
];

export const EQUIPMENT_STATUSES = [
  "Active",
  "Available",
  "Assigned",
  "Down",
  "In Shop",
  "Transporting",
  "Idle",
  "Inactive"
];

export const OWNERSHIP_TYPES = [
  "Owned",
  "Rental",
  "Subcontractor"
];

const typeAccentMap: Record<string, string> = {
  Dozer: "border-l-yellow-500",
  Excavator: "border-l-orange-500",
  Loader: "border-l-amber-500",
  "Skid Steer": "border-l-lime-500",
  Roller: "border-l-green-500",
  "Water Truck": "border-l-blue-500",
  "Fuel Truck": "border-l-red-500",
  "Service Truck": "border-l-slate-500",
  "Quad Axle Dump Truck": "border-l-zinc-500",
  "Triaxle Dump Truck": "border-l-zinc-500",
  "Dump Truck": "border-l-zinc-500",
  "Lowboy Truck": "border-l-stone-500",
  "Lowboy Trailer": "border-l-stone-500",
  "Lowboy Truck and Trailer": "border-l-stone-500",
  Grader: "border-l-purple-500",
  Scraper: "border-l-pink-500",
  Compactor: "border-l-emerald-500",
  Backhoe: "border-l-cyan-500",
  "Mini Excavator": "border-l-orange-400",
  Telehandler: "border-l-violet-500",
  Rental: "border-l-pink-500",
  Other: "border-l-slate-400"
};

const typeBadgeMap: Record<string, string> = {
  Dozer: "bg-yellow-100 text-yellow-900 border-yellow-200",
  Excavator: "bg-orange-100 text-orange-900 border-orange-200",
  Loader: "bg-amber-100 text-amber-900 border-amber-200",
  "Skid Steer": "bg-lime-100 text-lime-900 border-lime-200",
  Roller: "bg-green-100 text-green-900 border-green-200",
  "Water Truck": "bg-blue-100 text-blue-900 border-blue-200",
  "Fuel Truck": "bg-red-100 text-red-900 border-red-200",
  "Service Truck": "bg-slate-100 text-slate-800 border-slate-200",
  "Quad Axle Dump Truck": "bg-zinc-100 text-zinc-800 border-zinc-200",
  "Triaxle Dump Truck": "bg-zinc-100 text-zinc-800 border-zinc-200",
  "Dump Truck": "bg-zinc-100 text-zinc-800 border-zinc-200",
  "Lowboy Truck": "bg-stone-100 text-stone-800 border-stone-200",
  "Lowboy Trailer": "bg-stone-100 text-stone-800 border-stone-200",
  "Lowboy Truck and Trailer": "bg-stone-100 text-stone-800 border-stone-200",
  Grader: "bg-purple-100 text-purple-900 border-purple-200",
  Scraper: "bg-pink-100 text-pink-900 border-pink-200",
  Compactor: "bg-emerald-100 text-emerald-900 border-emerald-200",
  Backhoe: "bg-cyan-100 text-cyan-900 border-cyan-200",
  "Mini Excavator": "bg-orange-100 text-orange-900 border-orange-200",
  Telehandler: "bg-violet-100 text-violet-900 border-violet-200",
  Rental: "bg-pink-100 text-pink-900 border-pink-200",
  Other: "bg-slate-100 text-slate-800 border-slate-200"
};

export function equipmentTypeStyle(equipmentType?: string | null, ownershipType?: string | null) {
  const isRental = ownershipType === "Rental";
  const key = isRental ? "Rental" : equipmentType || "Other";

  return {
    cardClass: "bg-white border-slate-200",
    accentClass: typeAccentMap[key] ?? typeAccentMap.Other,
    badgeClass: typeBadgeMap[key] ?? typeBadgeMap.Other
  };
}

export function equipmentStatusDot(status?: string | null) {
  switch (status) {
    case "Down":
    case "In Shop":
      return "bg-red-500";
    case "Transporting":
      return "bg-yellow-400";
    case "Active":
    case "Available":
    case "Assigned":
      return "bg-green-500";
    case "Idle":
      return "bg-slate-400";
    case "Inactive":
      return "bg-zinc-300";
    default:
      return "bg-slate-300";
  }
}
