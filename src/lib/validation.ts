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
