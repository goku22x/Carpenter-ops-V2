import { z } from "zod";

const phasePayloadSchema = z.object({
  name: z.string().min(1, "Phase name is required"),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  progress_percent: z.number().min(0).max(100).nullable(),
  sort_order: z.number().int().min(0)
});

export const jobPayloadSchema = z.object({
  name: z.string().min(1, "Job name is required"),
  address: z.string().optional().nullable(),
  owner: z.string().optional().nullable(),
  site_contact: z.string().optional().nullable(),
  dropbox_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  phases: z.array(phasePayloadSchema).min(1, "At least one phase is required")
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

export const workOrderPayloadSchema = z.object({
  job_id: z.string().uuid().optional().nullable(),
  work_type: z.enum([
    "Survey",
    "Maintenance",
    "Equipment Request",
    "Mobilization",
    "Trucking",
    "Foreman Assignment",
    "Office",
    "General"
  ]),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  priority: z.enum(["Critical", "High", "Medium", "Low"]).default("Medium"),
  status: z.enum(["New", "Assigned", "In Progress", "Waiting", "Complete", "Closed"]).default("New"),
  assigned_personnel_id: z.string().uuid().optional().nullable(),
  related_equipment_id: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  custom_fields: z.record(z.string(), z.unknown()).optional().nullable()
});

export const workRequestSchema = workOrderPayloadSchema;
