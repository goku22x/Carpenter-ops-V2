export const EQUIPMENT_TYPES = [
  "Water Truck",
  "Dump Truck",
  "Triaxle Dump Truck",
  "Quad Axle Dump Truck",
  "Articulated Truck",
  "Lowboy Truck",
  "Lowboy Trailer",
  "Lowboy Truck and Trailer",
  "Small Dozer",
  "Medium Dozer",
  "Large Dozer",
  "Mini Excavator",
  "Small Excavator",
  "Medium Excavator",
  "Large Excavator",
  "Skid Steer",
  "Roller",
  "Trench Roller",
  "Backhoe",
  "Loader",
  "Sweeper",
  "Survey Gear",
  "Support",
  "Other"
];

export const EQUIPMENT_STATUSES = [
  "Active",
  "Down",
  "In Shop",
  "Transporting",
  "Inactive"
];

export const OWNERSHIP_TYPES = [
  "Owned",
  "Rental",
  "Subcontractor"
];

export function isTruckingType(type: string | null | undefined) {
  return [
    "Dump Truck",
    "Triaxle Dump Truck",
    "Quad Axle Dump Truck",
    "Lowboy Truck",
    "Lowboy Trailer",
    "Lowboy Truck and Trailer"
  ].includes(type ?? "");
}

export function equipmentTypeStyle(type: string | null | undefined, ownershipType?: string | null) {
  if (ownershipType === "Rental") {
    return {
      cardClass: "border-pink-400 bg-pink-50",
      badgeClass: "bg-pink-500 text-white",
      label: "Rental"
    };
  }

  switch (type) {
    case "Mini Excavator":
      return { cardClass: "border-sky-200 bg-sky-50", badgeClass: "bg-sky-200 text-sky-950", label: type };
    case "Small Excavator":
      return { cardClass: "border-blue-300 bg-blue-50", badgeClass: "bg-blue-400 text-white", label: type };
    case "Medium Excavator":
      return { cardClass: "border-blue-500 bg-blue-50", badgeClass: "bg-blue-600 text-white", label: type };
    case "Large Excavator":
      return { cardClass: "border-blue-900 bg-blue-50", badgeClass: "bg-blue-900 text-white", label: type };

    case "Small Dozer":
      return { cardClass: "border-yellow-200 bg-yellow-50", badgeClass: "bg-yellow-200 text-yellow-950", label: type };
    case "Medium Dozer":
      return { cardClass: "border-yellow-400 bg-yellow-50", badgeClass: "bg-yellow-500 text-black", label: type };
    case "Large Dozer":
      return { cardClass: "border-orange-400 bg-orange-50", badgeClass: "bg-orange-500 text-white", label: type };

    case "Roller":
      return { cardClass: "border-green-300 bg-green-50", badgeClass: "bg-green-400 text-green-950", label: type };
    case "Trench Roller":
      return { cardClass: "border-green-700 bg-green-50", badgeClass: "bg-green-700 text-white", label: type };

    case "Loader":
      return { cardClass: "border-amber-300 bg-amber-50", badgeClass: "bg-amber-300 text-amber-950", label: type };
    case "Backhoe":
      return { cardClass: "border-stone-500 bg-stone-50", badgeClass: "bg-stone-600 text-white", label: type };
    case "Skid Steer":
      return { cardClass: "border-slate-400 bg-slate-50", badgeClass: "bg-slate-500 text-white", label: type };

    case "Water Truck":
      return { cardClass: "border-cyan-300 bg-cyan-50", badgeClass: "bg-cyan-400 text-cyan-950", label: type };

    case "Articulated Truck":
      return { cardClass: "border-purple-300 bg-purple-50", badgeClass: "bg-purple-500 text-white", label: type };

    case "Triaxle Dump Truck":
      return { cardClass: "border-red-700 bg-red-50", badgeClass: "bg-red-700 text-white", label: type };
    case "Quad Axle Dump Truck":
      return { cardClass: "border-red-500 bg-red-50", badgeClass: "bg-red-500 text-white", label: type };
    case "Dump Truck":
      return { cardClass: "border-red-600 bg-red-50", badgeClass: "bg-red-600 text-white", label: type };
    case "Lowboy Truck":
    case "Lowboy Trailer":
    case "Lowboy Truck and Trailer":
      return { cardClass: "border-rose-900 bg-rose-50", badgeClass: "bg-rose-900 text-white", label: type };

    default:
      return { cardClass: "border-slate-200 bg-white", badgeClass: "bg-slate-300 text-slate-950", label: type || "Other" };
  }
}
