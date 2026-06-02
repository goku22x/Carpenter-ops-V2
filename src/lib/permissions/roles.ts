import type { Profile } from "@/lib/types";

export type AppRole = "admin" | "dispatcher" | "foreman" | "field" | "maintenance" | "survey" | "payroll" | "viewer" | "manager";

export const APP_ROLES: AppRole[] = ["admin", "dispatcher", "foreman", "field", "maintenance", "survey", "payroll", "viewer", "manager"];
export const ACCOUNT_STATUSES = ["pending", "active", "disabled"] as const;

export function clean(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

export function isActiveApproved(profile?: Pick<Profile, "active" | "status"> | null) {
  if (!profile) return false;
  const status = profile.status ?? (profile.active === false ? "disabled" : "active");
  return profile.active !== false && status === "active";
}

export function isAdmin(profile?: Pick<Profile, "role"> | null) {
  return ["admin", "manager"].includes(clean(profile?.role));
}

export function isDispatcher(profile?: Pick<Profile, "role" | "department"> | null) {
  const role = clean(profile?.role);
  const department = clean(profile?.department);
  return isAdmin(profile) || ["dispatcher", "operations", "superintendent"].includes(role) || department.includes("dispatch") || department.includes("equipment") || department.includes("operations");
}

export function isForeman(profile?: Pick<Profile, "role" | "department"> | null) {
  const role = clean(profile?.role);
  return isAdmin(profile) || isDispatcher(profile) || role === "foreman" || role.includes("foreman");
}

export function isMaintenance(profile?: Pick<Profile, "role" | "department"> | null) {
  const role = clean(profile?.role);
  const department = clean(profile?.department);
  return isAdmin(profile) || role === "maintenance" || department.includes("maintenance");
}

export function isSurvey(profile?: Pick<Profile, "role" | "department"> | null) {
  const role = clean(profile?.role);
  const department = clean(profile?.department);
  return isAdmin(profile) || role === "survey" || department.includes("survey");
}

export function isPayroll(profile?: Pick<Profile, "role" | "department"> | null) {
  const role = clean(profile?.role);
  const department = clean(profile?.department);
  return isAdmin(profile) || role === "payroll" || department.includes("payroll") || department.includes("office");
}

export function canUseDepartmentWork(profile?: Profile | null) {
  return isAdmin(profile) || isDispatcher(profile) || isMaintenance(profile) || isSurvey(profile) || clean(profile?.role).includes("lead");
}

export function canManagePersonnel(profile?: Profile | null) {
  return isAdmin(profile);
}

export function canManageTimekeeping(profile?: Profile | null) {
  return isAdmin(profile) || isPayroll(profile) || isForeman(profile);
}

export function canApproveTimekeeping(profile?: Profile | null) {
  return isAdmin(profile) || isPayroll(profile);
}
