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

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("*, job_phases(*)")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const payload = jobPayloadSchema.parse(await request.json());

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      organization_id: profile.organization_id,
      name: payload.name,
      address: payload.address || null,
      owner: payload.owner || null,
      site_contact: payload.site_contact || null,
      dropbox_url: payload.dropbox_url || null,
      notes: payload.notes || null,
      active: true
    })
    .select()
    .single();

  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 400 });

  const phaseRows = payload.phases.map((phase, index) => ({
    job_id: job.id,
    phase: phaseSlug(phase.name, index),
    name: phase.name,
    start_date: phase.start_date || null,
    end_date: phase.end_date || null,
    progress_percent: phase.progress_percent ?? 0,
    sort_order: phase.sort_order ?? index,
    status: "Not Started"
  }));

  const { error: phasesError } = await supabase
    .from("job_phases")
    .insert(phaseRows);

  if (phasesError) return NextResponse.json({ error: phasesError.message }, { status: 400 });

  return NextResponse.json(job, { status: 201 });
}
