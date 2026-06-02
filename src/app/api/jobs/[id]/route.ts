import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jobPayloadSchema } from "@/lib/validation";
import { phaseSlug } from "@/lib/phases";

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

  const { error: deleteError } = await supabase
    .from("job_phases")
    .delete()
    .eq("job_id", id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

  const phaseRows = payload.phases.map((phase, index) => ({
    job_id: id,
    phase: phaseSlug(phase.name, index),
    name: phase.name,
    start_date: phase.start_date || null,
    end_date: phase.end_date || null,
    progress_percent: phase.progress_percent ?? 0,
    sort_order: phase.sort_order ?? index,
    status: "Not Started"
  }));

  const { error: insertError } = await supabase
    .from("job_phases")
    .insert(phaseRows);

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  return NextResponse.json(job);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const { error: unassignError } = await supabase
    .from("equipment")
    .update({
      current_job_id: null,
      current_site: "Unassigned",
      updated_at: new Date().toISOString()
    })
    .eq("current_job_id", id)
    .eq("organization_id", profile.organization_id);

  if (unassignError) return NextResponse.json({ error: unassignError.message }, { status: 400 });

  const { data, error } = await supabase
    .from("jobs")
    .update({
      active: false,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("audit_log").insert({
    organization_id: profile.organization_id,
    actor_profile_id: profile.id,
    action: "archive",
    table_name: "jobs",
    record_id: id,
    new_value: data
  });

  return NextResponse.json({ ok: true });
}
