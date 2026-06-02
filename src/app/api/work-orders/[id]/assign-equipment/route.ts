import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

function customFieldsObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function canDispatch(profile: { role?: string | null; department?: string | null }) {
  const role = (profile.role ?? "").toLowerCase();
  const department = (profile.department ?? "").toLowerCase();

  return ["admin", "manager", "dispatcher", "operations", "superintendent"].includes(role) || department.includes("dispatch") || department.includes("equipment") || department.includes("operations");
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  if (!canDispatch(profile)) {
    return NextResponse.json({ error: "Only dispatch/admin/equipment users can assign equipment." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const equipmentId = typeof body.equipment_id === "string" ? body.equipment_id : "";

  if (!equipmentId) {
    return NextResponse.json({ error: "Pick the equipment unit to assign." }, { status: 400 });
  }

  const { data: workOrder, error: workOrderError } = await supabase
    .from("work_orders")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single();

  if (workOrderError) return NextResponse.json({ error: workOrderError.message }, { status: 400 });

  if (!["Equipment Request", "Mobilization"].includes(workOrder.work_type)) {
    return NextResponse.json({ error: "This assignment flow is only for equipment requests." }, { status: 400 });
  }

  if (["Complete", "Closed"].includes(workOrder.status)) {
    return NextResponse.json({ error: "This equipment request is already complete." }, { status: 400 });
  }

  if (!workOrder.job_id) {
    return NextResponse.json({ error: "Equipment request must be tied to a job before equipment can be assigned." }, { status: 400 });
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id,name")
    .eq("id", workOrder.job_id)
    .eq("organization_id", profile.organization_id)
    .single();

  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 400 });

  const { data: equipment, error: equipmentError } = await supabase
    .from("equipment")
    .select("*")
    .eq("id", equipmentId)
    .eq("organization_id", profile.organization_id)
    .single();

  if (equipmentError) return NextResponse.json({ error: equipmentError.message }, { status: 400 });

  if (equipment.active === false || equipment.status === "Archived") {
    return NextResponse.json({ error: "That equipment is archived/inactive." }, { status: 400 });
  }

  const fields = customFieldsObject(workOrder.custom_fields);
  const requestedType = String(fields.equipment_type_needed ?? "").trim().toLowerCase();
  const equipmentType = String(equipment.equipment_type ?? "").trim().toLowerCase();

  if (requestedType && equipmentType && requestedType !== equipmentType) {
    return NextResponse.json({
      error: `${equipment.name} is marked as ${equipment.equipment_type}, but the request is for ${fields.equipment_type_needed}.`
    }, { status: 400 });
  }

  if (equipment.current_job_id && equipment.current_job_id !== workOrder.job_id) {
    const { data: currentJob } = await supabase
      .from("jobs")
      .select("name")
      .eq("id", equipment.current_job_id)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    return NextResponse.json({
      error: `${equipment.name} ${equipment.equipment_number ? `#${equipment.equipment_number}` : ""} is already assigned to ${currentJob?.name ?? "another job"}. Remove it before assigning it here.`
    }, { status: 400 });
  }

  const now = new Date().toISOString();

  await supabase
    .from("equipment_assignments")
    .update({ removed_at: now, note: "Closed before new dispatch assignment." })
    .eq("equipment_id", equipmentId)
    .is("removed_at", null);

  const { data: updatedEquipment, error: updateEquipmentError } = await supabase
    .from("equipment")
    .update({
      current_job_id: workOrder.job_id,
      current_site: job.name,
      status: "Assigned",
      updated_at: now
    })
    .eq("id", equipmentId)
    .eq("organization_id", profile.organization_id)
    .select()
    .single();

  if (updateEquipmentError) return NextResponse.json({ error: updateEquipmentError.message }, { status: 400 });

  await supabase.from("equipment_assignments").insert({
    organization_id: profile.organization_id,
    equipment_id: equipmentId,
    job_id: workOrder.job_id,
    assigned_by_profile_id: profile.id,
    note: `Assigned from equipment request ${workOrder.title}.`
  });

  const nextDescription = [
    workOrder.description,
    `\n\n[Completed ${new Date().toLocaleString()}] Assigned ${equipment.name}${equipment.equipment_number ? ` #${equipment.equipment_number}` : ""} to ${job.name}.`
  ].filter(Boolean).join("");

  const { data: updatedWorkOrder, error: updateWorkOrderError } = await supabase
    .from("work_orders")
    .update({
      status: "Complete",
      related_equipment_id: equipmentId,
      description: nextDescription,
      completed_at: now,
      updated_at: now,
      custom_fields: {
        ...fields,
        assigned_equipment_id: equipmentId,
        assigned_equipment_name: equipment.name,
        assigned_equipment_number: equipment.equipment_number ?? "",
        completed_equipment_number: equipment.equipment_number ?? ""
      }
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .select()
    .single();

  if (updateWorkOrderError) return NextResponse.json({ error: updateWorkOrderError.message }, { status: 400 });

  await supabase.from("work_order_events").insert({
    organization_id: profile.organization_id,
    work_order_id: id,
    event_type: "equipment_assigned",
    from_status: workOrder.status,
    to_status: "Complete",
    note: `Dispatcher assigned ${equipment.name}${equipment.equipment_number ? ` #${equipment.equipment_number}` : ""}.`,
    created_by_profile_id: profile.id
  });

  await supabase.from("audit_log").insert({
    organization_id: profile.organization_id,
    actor_profile_id: profile.id,
    action: "dispatch_assign_equipment",
    table_name: "work_orders",
    record_id: id,
    old_value: workOrder,
    new_value: updatedWorkOrder
  });

  return NextResponse.json({ work_order: updatedWorkOrder, equipment: updatedEquipment });
}
