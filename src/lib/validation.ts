import { z } from "zod";

const phasePayloadSchema = z.object({
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  progress_percent: z.number().min(0).max(100).nullable()
});

export const jobPayloadSchema = z.object({
  name: z.string().min(1, "Job name is required"),
  address: z.string().optional().nullable(),
  owner: z.string().optional().nullable(),
  site_contact: z.string().optional().nullable(),
  dropbox_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  phases: z.object({
    earthwork: phasePayloadSchema,
    storm_drain: phasePayloadSchema,
    sewer: phasePayloadSchema,
    water: phasePayloadSchema,
    electrical: phasePayloadSchema,
    curb: phasePayloadSchema
  })
});

export const equipmentPayloadSchema = z.object({
  name: z.string().min(1, "Equipment name is required"),
  equipment_number: z.string().optional().nullable(),
  equipment_type: z.string().optional().nullable(),
  status: z.string().default("Active"),
  ownership_type: z.enum(["Owned", "Rental", "Subcontractor"]).default("Owned"),
  rental_company: z.string().optional().nullable(),
  rental_return_date: z.string().optional().nullable(),
  rental_notes: z.string().optional().nullable(),
  current_job_id: z.string().uuid().optional().nullable(),
  current_site: z.string().optional().nullable(),
  photo_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const personnelPayloadSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().default(true)
});

export const workRequestSchema = z.object({
  job_id: z.string().uuid().optional().nullable(),
  department: z.enum([
    "Earthwork",
    "Storm Drain",
    "Sewer",
    "Water",
    "Electrical",
    "Curb",
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
