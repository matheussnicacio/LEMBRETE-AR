import Link from "next/link";
import { scoped } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { formatBR, todayIn } from "@/lib/dates";

export const dynamic = "force-dynamic";

const FILTROS = [
  ["todos", "Todos"],
  ["vencidos", "Vencidos"],
  ["proximos", "Proximos 30 dias"],
  ["sem_data", "Sem data"],
  ["revogados", "Nao querem receber"],
] as const;

export default async function Clientes({ searchParams }: { searchParams: { q?: string; filtro?: string } }) {
  const s = requireSession();
  const db = scoped(s.accountId);
  const q = (searchParams.q ?? "").trim();
  const filtro = FILTROS.some(([k]) => k === searchParams.filtro) ? searchParams.filtro! : "todos";
  const tz = (await db.q("select timezone from accounts where id=$1")).rows[0].timezone;
  const params: unknown[] = [q];
  let where = "and c.consent_status <> 'revoked'";
  let having = "";
  if (filtro === "vencidos") { having = "having bool_or(e.next_due_on < $3::date)"; params.push(todayIn(tz)); }
  else if (filtro === "proximos") { having = "having bool_or(e.next_due_on between $3::date and $3::date + 30)"; params.push(todayIn(tz)); }
  else if (filtro === "sem_data") { having = "having bool_or(e.last_service_on is null)"; where = ""; }
  else if (filtro === "revogados") { where = "and c.consent_status = 'revoked'"; }
  else { where = ""; }
  const { rows } = await db.q(
    `select c.id, c.name, c.consent_status, count(e.id)::int as equipamentos,
            min(e.next_due_on)::text as proximo, bool_or(e.last_service_on is null) as sem_data
       from customers c left join equipment e on e.customer_id=c.id and e.active
      where c.account_id=$1 and c.active ${where} and ($2 = '' or c.name ilike '%' || $2 || '%')
      group by c.id ${having} order by min(e.next_due_on) nulls last, c.name limit 200`, params);
  return (
    <>
      {filtro !== "todos" && <Link href="/app" className="back">‹ Lembretes</Link>}
      <h1>{FILTROS.find(([k]) => k === filtro)![1] === "Todos" ? "Clientes" : FILTROS.find(([k]) => k === filtro)![1]}</h1>
      <div className="chips">
        {FILTROS.map(([k, label]) => (
          <Link key={k} href={k === "todos" ? "/app/customers" : `/app/customers?filtro=${k}`} className={`chip${k === filtro ? " on" : ""}`}>{label}</Link>
        ))}
      </div>
      <form method="GET">
        {filtro !== "todos" && <input type="hidden" name="filtro" value={filtro} />}
        <input name="q" defaultValue={q} placeholder="Buscar por nome" />
      </form>
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
