import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

// Descadastro direto: respeitado imediatamente.
export default async function OptOut({ params }: { params: { token: string } }) {
  const t = params.token;
  let ok = false;
  if (/^[0-9a-f]{64}$/.test(t)) {
    const c = (await pool.query(
      "update customers set consent_status='revoked', consent_at=now(), consent_source='opt_out_link' where opt_out_token=$1 returning id, account_id", [t])).rows[0];
    if (c) {
      ok = true;
      await pool.query("update reminders set status='skipped' where status='pending' and equipment_id in (select id from equipment where customer_id=$1)", [c.id]);
      await pool.query("insert into audit_log (account_id, actor, action, meta) values ($1,'customer','public.opt_out',$2)", [c.account_id, JSON.stringify({ customer_id: c.id })]);
    }
  }
  return (
    <div className="center">
      <div className="card">
        <p>{ok ? "Pronto. Voce nao vai mais receber mensagens." : "Link invalido."}</p>
      </div>
    </div>
  );
}
