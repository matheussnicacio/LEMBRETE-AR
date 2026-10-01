// Datas de vencimento sao "date" (sem horario): trabalhamos com strings YYYY-MM-DD.
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso + "T00:00:00Z");
  const b = Date.parse(toIso + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

/** next_due_on = last_service_on + interval_days */
export function nextDueOn(lastServiceOn: string | null, intervalDays: number): string | null {
  if (!lastServiceOn) return null;
  return addDays(lastServiceOn, intervalDays);
}

/** "Hoje" (YYYY-MM-DD) no fuso da conta. */
export function todayIn(tz: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function formatBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
