import type { Pool } from "pg";
import { addDays, todayIn } from "./dates";
import { nextSendWindow } from "./window";

export type Kind = "d-10" | "d0" | "d+15";
export const KIND_OFFSET: Record<Kind, number> = { "d-10": -10, d0: 0, "d+15": 15 };
const ORDER: Kind[] = ["d-10", "d0", "d+15"];

/** Maior gatilho ja atingido hoje (ou null se ainda nao chegou o d-10). Funcao pura. */
export function latestTriggeredKind(dueOn: string, today: string): Kind | null {
  let found: Kind | null = null;
  for (const k of ORDER) if (addDays(dueOn, KIND_OFFSET[k]) <= today) found = k;
  return found;
}

/**
 * Gera os lembretes devidos. Idempotente: unique(equipment_id, due_on, kind, channel).
 * Gera so o gatilho mais recente e marca os anteriores pendentes como "skipped".
 * Nao gera para: cliente revoked/inativo, equipamento inativo/sem data,
 * ciclo que ja tem pedido de agendamento/recusa.
 */
export async function generateDueReminders(pool: Pool, now = new Date()): Promise<number> {
  const { rows } = await pool.query(`
    select e.id as equipment_id, e.account_id, e.next_due_on::text as due_on,
           c.email, a.timezone
      from equipment e
      join customers c on c.id = e.customer_id
      join accounts a on a.id = e.account_id
     where e.active and e.next_due_on is not null
       and c.active and c.consent_status <> 'revoked'
       and a.plan_status <> 'canceled'
       and not exists (
         select 1 from booking_requests b join reminders r on r.id = b.reminder_id
          where r.equipment_id = e.id and r.due_on = e.next_due_on)
  `);
  let created = 0;
  for (const r of rows) {
    const kind = latestTriggeredKind(r.due_on, todayIn(r.timezone, now));
    if (!kind) continue;
    const channels = ["whatsapp_manual", ...(r.email ? ["email"] : [])];
    const scheduledFor = nextSendWindow(now, r.timezone);
    for (const channel of channels) {
      const ins = await pool.query(
        `insert into reminders (account_id, equipment_id, due_on, kind, channel, scheduled_for)
         values ($1,$2,$3,$4,$5,$6) on conflict (equipment_id, due_on, kind, channel) do nothing`,
        [r.account_id, r.equipment_id, r.due_on, kind, channel, scheduledFor]
      );
      created += ins.rowCount ?? 0;
    }
    await pool.query(
      `update reminders set status='skipped'
        where equipment_id=$1 and due_on=$2 and kind<>$3 and status='pending'`,
      [r.equipment_id, r.due_on, kind]
    );
  }
  return created;
}
