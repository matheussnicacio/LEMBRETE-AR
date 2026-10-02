import Link from "next/link";
import { scoped } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { todayIn } from "@/lib/dates";
import Icon, { IconCircle } from "@/components/Icon";

export const dynamic = "force-dynamic";

// cores da paleta Atlassian
const C = { blue: "#0052CC", red: "#DE350B", orange: "#FF991F", green: "#00875A", purple: "#6554C0", gray: "#6B778C" };

function Tile({ href, icon, color, count, label }: { href: string; icon: Parameters<typeof IconCircle>[0]["name"]; color: string; count: number; label: string }) {
  return (
    <Link href={href} className="tile card-link glass-panel">
      <div className="tile-top">
        <IconCircle name={icon} color={color} />
        <span className="count">{count}</span>
      </div>
      <div className="tile-label">{label}</div>
    </Link>
  );
}

export default async function Inicio() {
  const s = requireSession();
  const db = scoped(s.accountId);
  const acc = (await db.q("select name, timezone from accounts where id=$1")).rows[0];
  const today = todayIn(acc.timezone);

  const hoje = (await db.q(
    `select count(*)::int as n from reminders r
       join equipment e on e.id=r.equipment_id join customers c on c.id=e.customer_id
      where r.account_id=$1 and r.channel='whatsapp_manual' and r.status='pending'
        and r.scheduled_for <= now() and c.consent_status <> 'revoked'`)).rows[0].n;

  const pedidos = (await db.q("select count(*)::int as n from booking_requests where account_id=$1 and status='new'")).rows[0].n;

  const k = (await db.q(
    `select
       count(distinct c.id) filter (where c.active and c.consent_status<>'revoked' and e.next_due_on < $2::date)::int as vencidos,
       count(distinct c.id) filter (where c.active and c.consent_status<>'revoked' and e.next_due_on between $2::date and $2::date + 30)::int as proximos,
       count(distinct c.id) filter (where c.active and e.last_service_on is null)::int as sem_data,
       count(distinct c.id) filter (where c.active and c.consent_status='revoked')::int as revogados,
       count(distinct c.id) filter (where c.active)::int as total
     from customers c left join equipment e on e.customer_id=c.id and e.active
    where c.account_id=$1`, [today])).rows[0];

  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: acc.timezone, weekday: "long", day: "numeric", month: "long" }).format(new Date());

  const listas = [
    { href: "/app/customers", icon: "users" as const, color: C.purple, name: "Todos os clientes", n: k.total },
    { href: "/app/customers?filtro=sem_data", icon: "pencil" as const, color: C.orange, name: "Completar data do servico", n: k.sem_data },
    { href: "/app/customers?filtro=revogados", icon: "bellOff" as const, color: C.gray, name: "Nao querem receber", n: k.revogados },
  ];

  return (
    <>
      <div className="home-head">
        <h1>Lembretes</h1>
        <span className="muted">{dia.charAt(0).toUpperCase() + dia.slice(1)} · {acc.name}</span>
      </div>

      <div className="tiles">
        <Tile href="/app/hoje" icon="calendar" color={C.blue} count={hoje} label="Hoje" />
        <Tile href="/app/customers?filtro=vencidos" icon="alert" color={C.red} count={k.vencidos} label="Vencidos" />
        <Tile href="/app/customers?filtro=proximos" icon="clock" color={C.orange} count={k.proximos} label="Proximos 30 dias" />
        <Tile href="/app/hoje#pedidos" icon="inbox" color={C.green} count={pedidos} label="Pedidos de agendamento" />
      </div>

      <h2>Minhas Listas</h2>
      <div className="group glass-panel">
        {listas.map((l) => (
          <Link key={l.href} href={l.href} className="group-row">
            <IconCircle name={l.icon} color={l.color} size={30} />
            <span className="group-name">{l.name}</span>
            <span className="muted">{l.n}</span>
            <span className="chev" aria-hidden="true">›</span>
          </Link>
        ))}
      </div>

      <div className="home-actions">
        <Link href="/app/service/new" className="act">
          <span className="plus"><Icon name="plus" /></span> Servico feito
        </Link>
        <Link href="/app/customers/new" className="act">Novo cliente</Link>
      </div>
    </>
  );
}
