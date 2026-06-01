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
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const { error } = await supabase
    .from("work_orders")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
