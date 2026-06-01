import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json(
        { ok: false, error: userError.message },
        { status: 401 }
      );
    }

    if (!userData.user) {
      return NextResponse.json(
        { ok: false, error: "Server does not see a logged-in user." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,role,organization_id,active")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        {
          ok: false,
          userEmail: userData.user.email,
          error: profileError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      userId: userData.user.id,
      userEmail: userData.user.email,
      hasProfile: Boolean(profile),
      profile
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown debug error."
      },
      { status: 500 }
    );
  }
}
