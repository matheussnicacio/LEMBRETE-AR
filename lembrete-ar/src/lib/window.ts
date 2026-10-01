// Janela de envio: segunda a sabado, 8h as 18h no horario da conta.
const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function parts(date: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "2-digit", hour12: false });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { weekday: WEEKDAY[p.weekday], hour: Number(p.hour) % 24 };
}

export function isInSendWindow(date: Date, tz: string): boolean {
  const { weekday, hour } = parts(date, tz);
  return weekday !== 0 && hour >= 8 && hour < 18;
}

/** Proximo instante dentro da janela (o proprio instante, se ja estiver dentro). */
export function nextSendWindow(from: Date, tz: string): Date {
  let d = new Date(from.getTime());
  const STEP = 15 * 60 * 1000;
  for (let i = 0; i < 10 * 24 * 4; i++) {
    if (isInSendWindow(d, tz)) return d;
    d = new Date(d.getTime() + STEP);
  }
  return d;
}
