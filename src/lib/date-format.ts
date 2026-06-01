export function formatDate(dateString?: string | null) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  });
}

export function formatDateRange(startDate?: string | null, endDate?: string | null) {
  return `${formatDate(startDate)} → ${formatDate(endDate)}`;
}
