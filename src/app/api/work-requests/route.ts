import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { workRequestSchema } from "@/lib/validation";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("work_requests").select("*").order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const payload = workRequestSchema.parse(await request.json());
  const { data, error } = await supabase.from("work_requests").insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
