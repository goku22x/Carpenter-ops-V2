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

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("work_orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const payload = workOrderPayloadSchema.parse(await request.json());

  const { data, error } = await supabase
    .from("work_orders")
    .insert({
      organization_id: profile.organization_id,
      job_id: payload.job_id || null,
      work_type: payload.work_type,
      title: payload.title,
      description: payload.description || null,
      priority: payload.priority || "Medium",
      status: payload.status || "New",
      assigned_personnel_id: payload.assigned_personnel_id || null,
      requested_by_profile_id: profile.id,
      related_equipment_id: payload.related_equipment_id || null,
      due_date: payload.due_date || null,
      custom_fields: payload.custom_fields || {}
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("work_order_events").insert({
    organization_id: profile.organization_id,
    work_order_id: data.id,
    event_type: "created",
    to_status: data.status,
    note: "Work order created.",
    created_by_profile_id: profile.id
  });

  await supabase.from("audit_log").insert({
    organization_id: profile.organization_id,
    actor_profile_id: profile.id,
    action: "create",
    table_name: "work_orders",
    record_id: data.id,
    new_value: data
  });

  return NextResponse.json(data, { status: 201 });
}
