import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jobPayloadSchema } from "@/lib/validation";
import { PHASES } from "@/lib/phases";

async function getProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single();

  return profile;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const payload = jobPayloadSchema.parse(await request.json());

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .update({
      name: payload.name,
      address: payload.address || null,
      owner: payload.owner || null,
      site_contact: payload.site_contact || null,
      dropbox_url: payload.dropbox_url || null,
      notes: payload.notes || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .select()
    .single();

  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 400 });

  for (const phase of PHASES) {
    const values = payload.phases[phase.key];

    const { error } = await supabase
      .from("job_phases")
      .upsert({
        job_id: id,
        phase: phase.key,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        status: "Not Started"
      }, { onConflict: "job_id,phase" });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(job);
}
