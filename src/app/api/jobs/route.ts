import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jobSchema } from "@/lib/validation";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("jobs").select("*, job_phases(*)").order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const payload = jobSchema.parse(await request.json());
  const { data, error } = await supabase.from("jobs").insert(payload).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
