import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { personnelPayloadSchema } from "@/lib/validation";

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

  const payload = personnelPayloadSchema.parse(await request.json());

  const { data, error } = await supabase
    .from("personnel")
    .update({
      full_name: payload.full_name,
      department: payload.department || null,
      position: payload.position || null,
      email: payload.email || null,
      phone: payload.phone || null,
      notes: payload.notes || null,
      active: payload.active
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

  const { data, error } = await supabase
    .from("personnel")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("audit_log").insert({
    organization_id: profile.organization_id,
    actor_profile_id: profile.id,
    action: "deactivate",
    table_name: "personnel",
    record_id: id,
    new_value: data
  });

  return NextResponse.json({ ok: true });
}
