import type { PhaseKey } from "@/lib/types";

export const PHASES: Array<{ key: PhaseKey; label: string; className: string }> = [
  { key: "earthwork", label: "Earthwork", className: "bg-phase-earthwork" },
  { key: "storm_drain", label: "Storm Drain", className: "bg-phase-storm" },
  { key: "sewer", label: "Sewer", className: "bg-phase-sewer" },
  { key: "water", label: "Water", className: "bg-phase-water" }
];
