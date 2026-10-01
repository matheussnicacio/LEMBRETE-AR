import { scoped } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { todayIn } from "@/lib/dates";
import { SERVICE_KINDS } from "@/lib/templates";

export const dynamic = "force-dynamic";

export default async function NovoServico() {
  const s = requireSession();
  const db = scoped(s.accountId);
  const tz = (await db.q("select timezone from accounts where id=$1")).rows[0].timezone;
  const { rows } = await db.q(
    `select e.id, e.label, c.name from equipment e join customers c on c.id=e.customer_id
      where e.account_id=$1 and e.active and c.active order by c.name, e.label limit 500`);
  return (
    <>
      <h1>Servico feito</h1>
      <form method="POST" action="/api/services" className="card">
        <label htmlFor="equipment_id">Cliente / equipamento</label>
        <select id="equipment_id" name="equipment_id" required>
          {rows.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.label}</option>)}
        </select>
        <label htmlFor="performed_on">Data</label>
        <input id="performed_on" name="performed_on" type="date" defaultValue={todayIn(tz)} required />
        <label htmlFor="kind">Tipo</label>
        <select id="kind" name="kind">{SERVICE_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <label htmlFor="price">Valor em R$ (opcional)</label>
        <input id="price" name="price" inputMode="decimal" placeholder="180,00" />
        <button className="btn" type="submit">Servico feito hoje</button>
      </form>
    </>
  );
}
