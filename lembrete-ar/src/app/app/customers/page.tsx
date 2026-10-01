import Link from "next/link";
import { scoped } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { formatBR } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Clientes({ searchParams }: { searchParams: { q?: string } }) {
  const s = requireSession();
  const db = scoped(s.accountId);
  const q = (searchParams.q ?? "").trim();
  const { rows } = await db.q(
    `select c.id, c.name, c.consent_status, count(e.id)::int as equipamentos,
            min(e.next_due_on)::text as proximo, bool_or(e.last_service_on is null) as sem_data
       from customers c left join equipment e on e.customer_id=c.id and e.active
      where c.account_id=$1 and c.active and ($2 = '' or c.name ilike '%' || $2 || '%')
      group by c.id order by min(e.next_due_on) nulls last, c.name limit 200`, [q]);
  return (
    <>
      <h1>Clientes</h1>
      <form method="GET"><input name="q" defaultValue={q} placeholder="Buscar por nome" /></form>
      <Link className="btn" href="/app/customers/new">+ Novo cliente</Link>
      <div style={{ height: 12 }} />
      {rows.map((c) => (
        <Link className="card card-link" href={`/app/customers/${c.id}`} key={c.id}>
          <div className="row"><strong>{c.name}</strong><span className="muted">{c.equipamentos} equip. ›</span></div>
          <div className="muted">
            {c.sem_data ? "completar data do ultimo servico" : c.proximo ? `proxima: ${formatBR(c.proximo)}` : "sem equipamento"}
            {c.consent_status === "revoked" ? " · nao quer receber" : ""}
          </div>
        </Link>
      ))}
      {rows.length === 0 && <p className="muted">Nenhum cliente encontrado.</p>}
    </>
  );
}
