export type PhaseKey = "earthwork" | "storm_drain" | "sewer" | "water";

export type JobPhase = {
  id: string;
  job_id: string;
  phase: PhaseKey;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
};

export type Job = {
  id: string;
  name: string;
  address: string | null;
  owner: string | null;
  site_contact: string | null;
  dropbox_url: string | null;
  notes: string | null;
  sort_order: number;
  active: boolean;
  job_phases?: JobPhase[];
};

export type Profile = {
  id: string;
  organization_id: string;
  email: string;
  full_name: string | null;
  role: string;
  department: string | null;
};
