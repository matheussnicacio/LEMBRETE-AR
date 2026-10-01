import Link from "next/link";
import { scoped } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { formatBR, todayIn } from "@/lib/dates";
import { SERVICE_KINDS } from "@/lib/templates";

export const dynamic = "force-dynamic";
const KIND_LABEL = Object.fromEntries(SERVICE_KINDS) as Record<string, string>;
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function NovoServico({ searchParams }: { searchParams: { equipment?: string; erro?: string } }) {
  const s = requireSession();
  const db = scoped(s.accountId);
  const tz = (await db.q("select timezone from accounts where id=$1")).rows[0].timezone;
  const { rows } = await db.q(
    `select e.id, e.label, c.name from equipment e join customers c on c.id=e.customer_id
      where e.account_id=$1 and e.active and c.active order by c.name, e.label limit 500`);
  const recent = (await db.q(
    `select sv.id, sv.performed_on::text as day, sv.kind, sv.price_cents, e.label, c.id as customer_id, c.name
       from services sv join equipment e on e.id=sv.equipment_id join customers c on c.id=e.customer_id
      where sv.account_id=$1 order by sv.performed_on desc, sv.created_at desc limit 10`)).rows;
  const preselected = rows.some((r) => r.id === searchParams.equipment) ? searchParams.equipment : undefined;

  return (
    <>
      <h1>Servico feito</h1>
      <form method="POST" action="/api/services" className="card">
        {preselected && <input type="hidden" name="back" value="customer" />}
        <label htmlFor="equipment_id">Cliente / equipamento</label>
        <select id="equipment_id" name="equipment_id" required defaultValue={preselected}>
          {rows.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.label}</option>)}
        </select>
        <label htmlFor="performed_on">Data</label>
        <input id="performed_on" name="performed_on" type="date" defaultValue={todayIn(tz)} required />
        <label htmlFor="kind">Tipo</label>
        <select id="kind" name="kind">{SERVICE_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <label htmlFor="price">Valor em R$ (opcional)</label>
        <input id="price" name="price" inputMode="decimal" placeholder="180,00" />
        {searchParams.erro && <p className="err">Confira os dados e tente de novo.</p>}
        <button className="btn" type="submit">Servico feito hoje</button>
      </form>

      <h2 style={{ marginTop: 24 }}>Ultimos servicos</h2>
      {recent.length === 0 && <div className="card"><p className="muted" style={{ margin: 0 }}>Nenhum servico registrado ainda.</p></div>}
      {recent.length > 0 && (
        <div className="card timeline">
          {recent.map((r) => (
            <Link className="tl-item tl-link" href={`/app/customers/${r.customer_id}`} key={r.id}>
              <div className="row"><strong>{r.name}</strong><span>{formatBR(r.day)}</span></div>
              <div className="muted">{KIND_LABEL[r.kind] ?? r.kind} · {r.label}{r.price_cents != null ? ` · ${brl(r.price_cents)}` : ""}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
