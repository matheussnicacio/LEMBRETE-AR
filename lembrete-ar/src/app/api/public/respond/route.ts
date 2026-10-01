import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";

const schema = z.object({
  token: z.string().length(64),
  action: z.enum(["schedule", "decline", "stop"]),
  reason: z.string().max(200).optional(),
  period: z.enum(["manha", "tarde", "qualquer"]).optional(),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`respond:${ip}`, 20, 60_000)) return NextResponse.json({ error: "muitas tentativas" }, { status: 429 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalido" }, { status: 400 });
  const { token, action, reason, period } = p.data;
  if (!rateLimit(`token:${token}`, 10, 60_000)) return NextResponse.json({ error: "muitas tentativas" }, { status: 429 });

  const client = await pool.connect();
  try {
    await client.query("begin");
    const r = (await client.query(
      `select r.id, r.account_id, r.equipment_id, r.due_on, r.responded_at, r.expires_at, c.id as customer_id
         from reminders r join equipment e on e.id=r.equipment_id join customers c on c.id=e.customer_id
        where r.token=$1 for update of r`, [token])).rows[0];
    if (!r || new Date(r.expires_at) < new Date()) { await client.query("rollback"); return NextResponse.json({ error: "link expirado" }, { status: 404 }); }
    if (r.responded_at) { await client.query("rollback"); return NextResponse.json({ ok: true, already: true }); } // uso unico

    await client.query("update reminders set responded_at=now() where id=$1", [r.id]);
    // para os lembretes pendentes do ciclo
    await client.query("update reminders set status='skipped' where equipment_id=$1 and due_on=$2 and status='pending'", [r.equipment_id, r.due_on]);

    if (action === "schedule" || action === "decline") {
      await client.query(
        `insert into booking_requests (account_id, reminder_id, customer_id, status, preferred_period, decline_reason)
         values ($1,$2,$3,$4,$5,$6)`,
        [r.account_id, r.id, r.customer_id, action === "schedule" ? "new" : "declined", period ?? null, reason ?? null]
      );
    } else {
      await client.query("update customers set consent_status='revoked', consent_at=now(), consent_source='opt_out_link' where id=$1", [r.customer_id]);
      await client.query(
        "update reminders set status='skipped' where status='pending' and equipment_id in (select id from equipment where customer_id=$1)", [r.customer_id]);
    }
    await client.query("insert into audit_log (account_id, actor, action, meta) values ($1,'customer',$2,$3)",
      [r.account_id, `public.${action}`, JSON.stringify({ reminder_id: r.id })]);
    await client.query("commit");
    return NextResponse.json({ ok: true });
  } catch (e) {
    await client.query("rollback");
    console.error(e);
    return NextResponse.json({ error: "erro interno" }, { status: 500 });
  } finally { client.release(); }
}
