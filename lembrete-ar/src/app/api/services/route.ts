import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { nextDueOn } from "@/lib/dates";

const schema = z.object({
  equipment_id: z.string().uuid(),
  performed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(["limpeza", "higienizacao", "preventiva", "corretiva", "instalacao"]).default("limpeza"),
  price: z.string().optional(),
  back: z.string().optional(),
});

// Registrar servico: atualiza last/next na mesma transacao e cancela lembretes do ciclo anterior.
export async function POST(req: Request) {
  const s = getSession();
  if (!s) return new NextResponse("nao autenticado", { status: 401 });
  const p = schema.safeParse(Object.fromEntries(await req.formData()));
  if (!p.success) return NextResponse.redirect(new URL("/app/service/new?erro=1", req.url), 303);
  const d = p.data;
  const cents = d.price ? Math.round(parseFloat(d.price.replace(",", ".")) * 100) : null;
  if (cents !== null && (!Number.isFinite(cents) || cents < 0)) return NextResponse.redirect(new URL("/app/service/new?erro=valor", req.url), 303);

  let backTo = "/app";
  const client = await pool.connect();
  try {
    await client.query("begin");
    const eq = await client.query("select interval_days, customer_id from equipment where id=$1 and account_id=$2 for update", [d.equipment_id, s.accountId]);
    if (!eq.rowCount) { await client.query("rollback"); return new NextResponse("equipamento nao encontrado", { status: 404 }); }
    if (d.back === "customer") backTo = `/app/customers/${eq.rows[0].customer_id}`;
    await client.query(
      "insert into services (account_id, equipment_id, performed_on, kind, price_cents, user_id) values ($1,$2,$3,$4,$5,$6)",
      [s.accountId, d.equipment_id, d.performed_on, d.kind, cents, s.userId]
    );
    // so avanca o ciclo se este servico for o mais recente
    await client.query(
      `update equipment set last_service_on=$3, next_due_on=$4
        where id=$1 and account_id=$2 and (last_service_on is null or last_service_on <= $3)`,
      [d.equipment_id, s.accountId, d.performed_on, nextDueOn(d.performed_on, eq.rows[0].interval_days)]
    );
    await client.query("update reminders set status='skipped' where equipment_id=$1 and account_id=$2 and status='pending'", [d.equipment_id, s.accountId]);
    await client.query("insert into audit_log (account_id, actor, action, meta) values ($1,$2,'service.create',$3)",
      [s.accountId, s.userId, JSON.stringify({ equipment_id: d.equipment_id })]);
    await client.query("commit");
  } catch (e) { await client.query("rollback"); throw e; } finally { client.release(); }
  return NextResponse.redirect(new URL(backTo, req.url), 303);
}
