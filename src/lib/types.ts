export type JobPhase = {
  id?: string;
  job_id?: string;
  phase: string | null;
  name: string;
  start_date: string | null;
  end_date: string | null;
  progress_percent: number | null;
  status: string | null;
  sort_order: number;
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
  phone?: string | null;
  active?: boolean;
  status?: string | null;
  created_at?: string;
};

export type Equipment = {
  id: string;
  organization_id: string;
  name: string;
  equipment_number: string | null;
  equipment_type: string | null;
  status: string;
  ownership_type: string | null;
  rental_company: string | null;
  rental_return_date: string | null;
  rental_notes: string | null;
  current_job_id: string | null;
  current_site: string | null;
  assigned_foreman_id: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Personnel = {
  id: string;
  organization_id: string;
  full_name: string;
  department: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
};

export type WorkOrder = {
  id: string;
  organization_id: string;
  job_id: string | null;
  work_type: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assigned_personnel_id: string | null;
  requested_by_profile_id: string | null;
  related_equipment_id: string | null;
  due_date: string | null;
  custom_fields: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};


export type TimeEntry = {
  id: string;
  organization_id: string;
  time_sheet_id: string;
  employee_personnel_id: string | null;
  employee_profile_id: string | null;
  start_time: string | null;
  end_time: string | null;
  lunch_minutes: number;
  regular_hours: number | null;
  overtime_hours: number | null;
  notes: string | null;
  status: string;
  employee_signed_at: string | null;
  created_at?: string;
  updated_at?: string;
  personnel?: Personnel | null;
  profiles?: Profile | null;
};

export type TimeSheet = {
  id: string;
  organization_id: string;
  foreman_profile_id: string | null;
  job_id: string | null;
  work_date: string;
  status: string;
  notes: string | null;
  submitted_at: string | null;
  approved_by_profile_id: string | null;
  approved_at: string | null;
  created_at?: string;
  updated_at?: string;
  jobs?: Job | null;
  time_entries?: TimeEntry[];
};
