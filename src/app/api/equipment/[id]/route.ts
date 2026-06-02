import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { equipmentPayloadSchema } from "@/lib/validation";

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

  const payload = equipmentPayloadSchema.parse(await request.json());

  const { data: existing, error: existingError } = await supabase
    .from("equipment")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });

  const { data, error } = await supabase
    .from("equipment")
    .update({
      name: payload.name,
      equipment_number: payload.equipment_number || null,
      equipment_type: payload.equipment_type || null,
      status: payload.status || "Active",
      ownership_type: payload.ownership_type || "Owned",
      rental_company: payload.ownership_type === "Rental" ? payload.rental_company || null : null,
      rental_return_date: payload.ownership_type === "Rental" ? payload.rental_return_date || null : null,
      rental_notes: payload.ownership_type === "Rental" ? payload.rental_notes || null : null,
      current_job_id: payload.current_job_id || null,
      current_site: payload.current_site || null,
      photo_url: payload.photo_url || null,
      notes: payload.notes || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (existing.current_job_id !== data.current_job_id) {
    await supabase
      .from("equipment_assignments")
      .update({ removed_at: new Date().toISOString() })
      .eq("equipment_id", id)
      .is("removed_at", null);

    if (data.current_job_id) {
      await supabase.from("equipment_assignments").insert({
        organization_id: profile.organization_id,
        equipment_id: id,
        job_id: data.current_job_id,
        assigned_foreman_id: data.assigned_foreman_id ?? null,
        assigned_by_profile_id: profile.id,
        note: "Assigned from equipment editor."
      });
    }

    await supabase.from("equipment_events").insert({
      equipment_id: id,
      event_type: "job_assignment_changed",
      from_job_id: existing.current_job_id,
      to_job_id: data.current_job_id,
      note: "Equipment job assignment changed.",
      created_by: profile.id
    });
  }

  await supabase.from("audit_log").insert({
    organization_id: profile.organization_id,
    actor_profile_id: profile.id,
    action: "update",
    table_name: "equipment",
    record_id: id,
    old_value: existing,
    new_value: data
  });

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("equipment")
    .update({
      active: false,
      status: "Archived",
      current_job_id: null,
      current_site: "Archived",
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase
    .from("equipment_assignments")
    .update({ removed_at: new Date().toISOString(), note: "Equipment archived." })
    .eq("equipment_id", id)
    .is("removed_at", null);

  await supabase.from("audit_log").insert({
    organization_id: profile.organization_id,
    actor_profile_id: profile.id,
    action: "archive",
    table_name: "equipment",
    record_id: id,
    new_value: data
  });

  return NextResponse.json({ ok: true });
}
