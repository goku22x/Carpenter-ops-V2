import { NextResponse } from "next/server";

export async function POST() {
  // User provisioning is now handled by the Supabase database trigger:
  // public.handle_new_auth_user().
  //
  // This route remains intentionally harmless so older deployed client code
  // that still calls /api/bootstrap does not block login with a 500.
  return NextResponse.json({
    ok: true,
    message: "Bootstrap is handled by the database trigger."
  });
}
