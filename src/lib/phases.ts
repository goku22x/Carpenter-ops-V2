export const DEFAULT_JOB_PHASES = [
  "Earthwork",
  "Storm Drain",
  "Sewer",
  "Water",
  "Custom 1",
  "Custom 2"
];

export function phaseSlug(name: string, index: number) {
  const clean = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return clean || `phase_${index + 1}`;
}

export function phaseColorClass(index: number) {
  const classes = [
    "bg-yellow-300",
    "bg-orange-500",
    "bg-lime-400",
    "bg-blue-400",
    "bg-purple-300",
    "bg-stone-400",
    "bg-cyan-300",
    "bg-rose-300",
    "bg-emerald-300",
    "bg-slate-300"
  ];

  return classes[index % classes.length];
}
