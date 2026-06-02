import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { workOrderPayloadSchema } from "@/lib/validation";

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

  if (!profile) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const payload = workOrderPayloadSchema.parse(await request.json());

  const { data: existing, error: existingError } = await supabase
    .from("work_orders")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 });

  const { data, error } = await supabase
    .from("work_orders")
    .update({
      job_id: payload.job_id || null,
      work_type: payload.work_type,
      title: payload.title,
      description: payload.description || null,
      priority: payload.priority || "Medium",
      status: payload.status || "New",
      assigned_personnel_id: payload.assigned_personnel_id || null,
      related_equipment_id: payload.related_equipment_id || null,
      due_date: payload.due_date || null,
      custom_fields: payload.custom_fields || {},
      completed_at: ["Complete", "Closed"].includes(payload.status) ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (existing.status !== data.status) {
    await supabase.from("work_order_events").insert({
      organization_id: profile.organization_id,
      work_order_id: id,
      event_type: "status_change",
      from_status: existing.status,
      to_status: data.status,
      note: "Status changed from work order editor.",
      created_by_profile_id: profile.id
    });
  }

  if (data.work_type === "Maintenance" && ["Complete", "Closed"].includes(data.status) && data.related_equipment_id) {
    await supabase.from("maintenance_history").insert({
      organization_id: profile.organization_id,
      equipment_id: data.related_equipment_id,
      work_order_id: id,
      performed_by_personnel_id: data.assigned_personnel_id,
      notes: data.description
    });
  }

  await supabase.from("audit_log").insert({
    organization_id: profile.organization_id,
    actor_profile_id: profile.id,
    action: "update",
    table_name: "work_orders",
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
    .from("work_orders")
    .update({
      status: "Closed",
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("work_order_events").insert({
    organization_id: profile.organization_id,
    work_order_id: id,
    event_type: "archived",
    to_status: "Closed",
    note: "Work order archived instead of deleted.",
    created_by_profile_id: profile.id
  });

  await supabase.from("audit_log").insert({
    organization_id: profile.organization_id,
    actor_profile_id: profile.id,
    action: "archive",
    table_name: "work_orders",
    record_id: id,
    new_value: data
  });

  return NextResponse.json({ ok: true });
}
