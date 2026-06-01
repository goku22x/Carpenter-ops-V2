import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Invalid auth token." }, { status: 401 });
    }

    const user = userData.user;
    const body = await request.json().catch(() => ({}));
    const fullName = String(body.fullName || user.user_metadata?.full_name || "").trim();

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json({ profile: existingProfile });
    }

    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    let organizationId: string | null = null;

    const { data: firstOrg } = await admin
      .from("organizations")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (firstOrg) {
      organizationId = firstOrg.id;
    } else {
      const { data: org, error: orgError } = await admin
        .from("organizations")
        .insert({ name: "Carpenter Excavation" })
        .select()
        .single();

      if (orgError) throw orgError;
      organizationId = org.id;
    }

    const role = count === 0 ? "admin" : "viewer";

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .insert({
        id: user.id,
        organization_id: organizationId,
        email: user.email,
        full_name: fullName || user.email,
        role,
        department: null,
        active: true
      })
      .select()
      .single();

    if (profileError) throw profileError;

    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bootstrap failed." },
      { status: 500 }
    );
  }
}
