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
    .from("equipment")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
