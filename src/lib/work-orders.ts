export const WORK_ORDER_TYPES = [
  "Survey",
  "Maintenance",
  "Mobilization",
  "Trucking",
  "Foreman Assignment",
  "Office",
  "General"
];

export const WORK_ORDER_PRIORITIES = [
  "Critical",
  "High",
  "Medium",
  "Low"
];

export const WORK_ORDER_STATUSES = [
  "New",
  "Assigned",
  "In Progress",
  "Waiting",
  "Complete",
  "Closed"
];

export function getWorkOrderTypeColor(type: string | null | undefined) {
  switch (type) {
    case "Survey":
      return "bg-blue-100 text-blue-900 border-blue-300";
    case "Maintenance":
      return "bg-red-100 text-red-900 border-red-300";
    case "Mobilization":
      return "bg-purple-100 text-purple-900 border-purple-300";
    case "Trucking":
      return "bg-orange-100 text-orange-900 border-orange-300";
    case "Foreman Assignment":
      return "bg-green-100 text-green-900 border-green-300";
    case "Office":
      return "bg-slate-100 text-slate-900 border-slate-300";
    default:
      return "bg-gray-100 text-gray-900 border-gray-300";
  }
}
