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

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("personnel")
    .select("*")
    .order("active", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const payload = personnelPayloadSchema.parse(await request.json());

  const { data, error } = await supabase
    .from("personnel")
    .insert({
      organization_id: profile.organization_id,
      full_name: payload.full_name,
      department: payload.department || null,
      position: payload.position || null,
      email: payload.email || null,
      phone: payload.phone || null,
      notes: payload.notes || null,
      active: payload.active
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data, { status: 201 });
}
