import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const VALID_ROLES = ["admin", "dispatcher", "foreman", "field", "maintenance", "survey", "payroll", "viewer", "manager"] as const;
const VALID_STATUSES = ["pending", "active", "disabled"] as const;

const profileUpdateSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().optional().nullable(),
  role: z.enum(VALID_ROLES),
  department: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  status: z.enum(VALID_STATUSES)
});

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

function isAdminProfile(profile: { role?: string | null }) {
  return ["admin", "manager"].includes((profile.role ?? "").trim().toLowerCase());
}

export async function GET() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || !isAdminProfile(profile)) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, organization_id, email, full_name, role, department, phone, active, status, created_at")
    .eq("organization_id", profile.organization_id)
    .order("status", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data ?? []);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || !isAdminProfile(profile)) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const payload = profileUpdateSchema.parse(await request.json());

  if (payload.id === profile.id && payload.status !== "active") {
    return NextResponse.json({ error: "You cannot disable or unapprove your own account." }, { status: 400 });
  }

  if (payload.id === profile.id && !["admin", "manager"].includes(payload.role)) {
    return NextResponse.json({ error: "You cannot remove your own admin access." }, { status: 400 });
  }

  const active = payload.status === "active";

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: payload.full_name || null,
      role: payload.role,
      department: payload.department || null,
      phone: payload.phone || null,
      status: payload.status,
      active,
      updated_at: new Date().toISOString()
    })
    .eq("id", payload.id)
    .eq("organization_id", profile.organization_id)
    .select("id, organization_id, email, full_name, role, department, phone, active, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("audit_log").insert({
    organization_id: profile.organization_id,
    actor_profile_id: profile.id,
    action: "update_user_role_status",
    table_name: "profiles",
    record_id: payload.id,
    new_value: data
  });

  return NextResponse.json(data);
}
