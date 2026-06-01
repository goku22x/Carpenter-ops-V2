import { z } from "zod";

export const jobPayloadSchema = z.object({
  name: z.string().min(1, "Job name is required"),
  address: z.string().optional().nullable(),
  owner: z.string().optional().nullable(),
  site_contact: z.string().optional().nullable(),
  dropbox_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  phases: z.object({
    earthwork: z.object({ start_date: z.string().nullable(), end_date: z.string().nullable() }),
    storm_drain: z.object({ start_date: z.string().nullable(), end_date: z.string().nullable() }),
    sewer: z.object({ start_date: z.string().nullable(), end_date: z.string().nullable() }),
    water: z.object({ start_date: z.string().nullable(), end_date: z.string().nullable() })
  })
});

export const equipmentPayloadSchema = z.object({
  name: z.string().min(1, "Equipment name is required"),
  equipment_number: z.string().optional().nullable(),
  equipment_type: z.string().optional().nullable(),
  status: z.string().default("Active"),
  current_job_id: z.string().uuid().optional().nullable(),
  current_site: z.string().optional().nullable(),
  photo_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const workRequestSchema = z.object({
  job_id: z.string().uuid().optional().nullable(),
  department: z.enum([
    "Earthwork",
    "Storm Drain",
    "Sewer",
    "Water",
    "Survey",
    "Maintenance",
    "Mobilization",
    "Office",
    "Trucks"
  ]),
  priority: z.enum(["Critical", "High", "Medium", "Low"]).default("Medium"),
  status: z.enum(["New", "Assigned", "In Progress", "Waiting", "Complete", "Closed"]).default("New"),
  assigned_personnel_id: z.string().uuid().optional().nullable(),
  equipment_id: z.string().uuid().optional().nullable(),
  equipment_type_requested: z.string().optional().nullable(),
  due_at: z.string().datetime().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  dropbox_url: z.string().optional().nullable()
});
