import Link from "next/link";
import { notFound } from "next/navigation";
import { scoped } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { daysBetween, formatBR, todayIn } from "@/lib/dates";
import { SERVICE_KINDS } from "@/lib/templates";

export const dynamic = "force-dynamic";

const KIND_LABEL = Object.fromEntries(SERVICE_KINDS) as Record<string, string>;
const REM_KIND: Record<string, string> = { "d-10": "10 dias antes", d0: "No vencimento", "d+15": "15 dias depois" };
const REM_CHANNEL: Record<string, string> = { email: "E-mail", whatsapp_manual: "WhatsApp", whatsapp_api: "WhatsApp API" };
const REM_STATUS: Record<string, string> = { pending: "Pendente", sent: "Enviado", failed: "Falhou", skipped: "Cancelado" };
const CONSENT: Record<string, [string, string]> = {
  granted: ["Autorizado", "ok"],
  unknown: ["Sem autorizacao registrada", "warn"],
  revoked: ["Nao quer receber", "bad"],
};
const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function ClientePage({ params }: { params: { id: string } }) {
  const s = requireSession();
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const db = scoped(s.accountId);

  const customer = (await db.q(
    "select id, name, phone_e164, email, consent_status, notes, created_at::date::text as since from customers where account_id=$1 and id=$2",
    [params.id]
  )).rows[0];
  if (!customer) notFound();

  const tz = (await db.q("select timezone from accounts where id=$1")).rows[0].timezone;
  const today = todayIn(tz);

  const equipment = (await db.q(
    `select id, label, type, btu, interval_days, last_service_on::text as last, next_due_on::text as due
       from equipment where account_id=$1 and customer_id=$2 and active order by label`,
    [params.id]
  )).rows;

  const services = (await db.q(
    `select sv.id, sv.performed_on::text as day, sv.kind, sv.price_cents, sv.notes, e.label
       from services sv join equipment e on e.id = sv.equipment_id
      where sv.account_id=$1 and e.customer_id=$2
      order by sv.performed_on desc, sv.created_at desc limit 100`,
    [params.id]
  )).rows;

  const reminders = (await db.q(
    `select r.id, r.kind, r.channel, r.status, r.due_on::text as due, r.sent_at, e.label
       from reminders r join equipment e on e.id = r.equipment_id
      where r.account_id=$1 and e.customer_id=$2
      order by r.created_at desc limit 20`,
    [params.id]
  )).rows;

  const total = services.reduce((n, x) => n + (x.price_cents ?? 0), 0);
  const [consentLabel, consentTone] = CONSENT[customer.consent_status] ?? CONSENT.unknown;

  return (
    <>
      <Link href="/app/customers" className="back">‹ Clientes</Link>
      <h1>{customer.name}</h1>

      <div className="card">
        <div className="row"><span className="muted">WhatsApp</span><span>{customer.phone_e164 ?? "—"}</span></div>
        <div className="row"><span className="muted">E-mail</span><span>{customer.email ?? "—"}</span></div>
        <div className="row"><span className="muted">Contato</span><span className={`badge ${consentTone}`}>{consentLabel}</span></div>
        <div className="row"><span className="muted">Cliente desde</span><span>{formatBR(customer.since)}</span></div>
        {customer.phone_e164 && (
          <a className="btn ghost" href={`https://wa.me/${customer.phone_e164}`} target="_blank" rel="noopener noreferrer">
            Chamar no WhatsApp
          </a>
        )}
      </div>

      <h2>Equipamentos</h2>
      {equipment.length === 0 && <p className="muted">Nenhum equipamento cadastrado.</p>}
      {equipment.map((e) => {
        const diff = e.due ? daysBetween(today, e.due) : null;
        return (
          <div className="card" key={e.id}>
            <div className="row">
              <strong>{e.label}</strong>
              <span className="muted">{e.type}{e.btu ? ` · ${Number(e.btu).toLocaleString("pt-BR")} BTU` : ""}</span>
            </div>
            <div className="muted">Intervalo: {e.interval_days} dias</div>
            <div className="row">
              <span className="muted">Ultimo servico</span>
              <span>{e.last ? formatBR(e.last) : "nao informado"}</span>
            </div>
            <div className="row">
              <span className="muted">Proxima manutencao</span>
              <span className={diff !== null && diff < 0 ? "late" : ""}>
                {e.due ? `${formatBR(e.due)}${diff !== null ? (diff < 0 ? ` (venceu ha ${-diff}d)` : diff === 0 ? " (hoje)" : ` (em ${diff}d)`) : ""}` : "—"}
              </span>
            </div>
            <Link className="btn" href={`/app/service/new?equipment=${e.id}`}>Servico feito</Link>
          </div>
        );
      })}

      <div className="row" style={{ marginTop: 32 }}>
        <h2 style={{ margin: 0 }}>Historico de servicos</h2>
        {services.length > 0 && <span className="muted">{services.length} {services.length === 1 ? "servico" : "servicos"}{total > 0 ? ` · ${brl(total)}` : ""}</span>}
      </div>
      {services.length === 0 && <div className="card"><p className="muted" style={{ margin: 0 }}>Nenhum servico registrado ainda. Use “Servico feito” em um equipamento acima.</p></div>}
      {services.length > 0 && (
        <div className="card timeline">
          {services.map((sv) => (
            <div className="tl-item" key={sv.id}>
              <div className="row">
                <strong>{KIND_LABEL[sv.kind] ?? sv.kind}</strong>
                <span>{formatBR(sv.day)}</span>
              </div>
              <div className="muted">{sv.label}{sv.price_cents != null ? ` · ${brl(sv.price_cents)}` : ""}</div>
              {sv.notes && <div className="muted">{sv.notes}</div>}
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: 32 }}>Lembretes enviados</h2>
      {reminders.length === 0 && <div className="card"><p className="muted" style={{ margin: 0 }}>Nenhum lembrete gerado ainda.</p></div>}
      {reminders.length > 0 && (
        <div className="card timeline">
          {reminders.map((r) => (
            <div className="tl-item" key={r.id}>
              <div className="row">
                <strong>{REM_KIND[r.kind] ?? r.kind} · {REM_CHANNEL[r.channel] ?? r.channel}</strong>
                <span className={`badge ${r.status === "sent" ? "ok" : r.status === "failed" ? "bad" : "neutral"}`}>{REM_STATUS[r.status] ?? r.status}</span>
              </div>
              <div className="muted">{r.label} · vencimento {formatBR(r.due)}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
