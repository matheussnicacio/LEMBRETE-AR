import { NextResponse } from "next/server";
import { z } from "zod";
import { pool, scoped } from "@/lib/db";
import { getSession } from "@/lib/session";
import { toE164BR } from "@/lib/phone";
import { nextDueOn } from "@/lib/dates";

const schema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal("")),
  label: z.string().max(120).default("Ar-condicionado"),
  type: z.enum(["split", "janela", "piso-teto", "cassete", "central"]).default("split"),
  btu: z.coerce.number().int().positive().optional().or(z.literal("")),
  interval_days: z.coerce.number().int().min(7).max(1095),
  last_service_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  consent: z.string().optional(),
});

// Cadastro rapido: cliente + 1 equipamento
export async function POST(req: Request) {
  const s = getSession();
  if (!s) return new NextResponse("nao autenticado", { status: 401 });
  const parsed = schema.safeParse(Object.fromEntries(await req.formData()));
  if (!parsed.success) return NextResponse.redirect(new URL("/app/customers/new?erro=1", req.url), 303);
  const d = parsed.data;
  const phone = toE164BR(d.phone);
  if (!phone) return NextResponse.redirect(new URL("/app/customers/new?erro=telefone", req.url), 303);
  const last = d.last_service_on || null;
  const db = scoped(s.accountId);

  const client = await pool.connect();
  try {
    await client.query("begin");
    const c = await client.query(
      `insert into customers (account_id, name, phone_e164, email, consent_status, consent_at, consent_source)
       values ($1,$2,$3,$4,$5, case when $5='granted' then now() end, 'cadastro_manual') returning id`,
      [db.accountId, d.name, phone, d.email || null, d.consent ? "granted" : "unknown"]
    );
    await client.query(
      `insert into equipment (account_id, customer_id, label, type, btu, interval_days, last_service_on, next_due_on)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [db.accountId, c.rows[0].id, d.label, d.type, d.btu === "" ? null : d.btu ?? null, d.interval_days, last, nextDueOn(last, d.interval_days)]
    );
    await client.query("insert into audit_log (account_id, actor, action, meta) values ($1,$2,'customer.create',$3)",
      [db.accountId, s.userId, JSON.stringify({ customer_id: c.rows[0].id })]);
    await client.query("commit");
  } catch (e) { await client.query("rollback"); throw e; } finally { client.release(); }
  return NextResponse.redirect(new URL("/app/customers", req.url), 303);
}
