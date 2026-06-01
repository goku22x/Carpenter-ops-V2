import type { PhaseKey } from "@/lib/types";

export const PHASES: Array<{
  key: PhaseKey;
  label: string;
  className: string;
}> = [
  {
    key: "earthwork",
    label: "Earthwork",
    className: "bg-yellow-300"
  },
  {
    key: "storm_drain",
    label: "Storm Drain",
    className: "bg-orange-500"
  },
  {
    key: "sewer",
    label: "Sewer",
    className: "bg-lime-400"
  },
  {
    key: "water",
    label: "Water",
    className: "bg-blue-400"
  },
  {
    key: "electrical",
    label: "Electrical",
    className: "bg-purple-300"
  },
  {
    key: "curb",
    label: "Curb",
    className: "bg-stone-400"
  }
];
