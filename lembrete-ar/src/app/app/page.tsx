import Link from "next/link";
import { scoped } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { daysBetween, formatBR, todayIn } from "@/lib/dates";
import { renderWaMessage } from "@/lib/templates";
import WhatsAppButton from "@/components/WhatsAppButton";

export const dynamic = "force-dynamic";

export default async function Hoje() {
  const s = requireSession();
  const db = scoped(s.accountId);
  const acc = (await db.q("select name, timezone, wa_template from accounts where id=$1")).rows[0];
  const today = todayIn(acc.timezone);
  const base = process.env.APP_URL ?? "";

  const { rows } = await db.q(
    `select r.id, r.token, r.due_on::text, e.label, e.btu, c.name, c.phone_e164
       from reminders r
       join equipment e on e.id=r.equipment_id
       join customers c on c.id=e.customer_id
      where r.account_id=$1 and r.channel='whatsapp_manual' and r.status='pending'
        and r.scheduled_for <= now() and c.consent_status <> 'revoked'
      order by r.due_on asc`);
  const bookings = (await db.q(
    `select b.id, b.preferred_period, c.name, c.phone_e164
       from booking_requests b join customers c on c.id=b.customer_id
      where b.account_id=$1 and b.status='new' order by b.created_at desc limit 10`)).rows;

  return (
    <>
      <h1>Hoje: {rows.length} {rows.length === 1 ? "cliente" : "clientes"} para lembrar</h1>
      {rows.length === 0 && (
        <div className="card">
          <p>Nada para lembrar agora.</p>
          <Link className="btn" href="/app/customers/new">Cadastrar cliente</Link>
        </div>
      )}
      {rows.map((r) => {
        const diff = daysBetween(today, r.due_on);
        const msg = renderWaMessage(acc.wa_template, {
          nome: r.name, empresa: acc.name, equipamento: r.label, link: `${base}/r/${r.token}`,
        });
        const href = r.phone_e164 ? `https://wa.me/${r.phone_e164}?text=${encodeURIComponent(msg)}` : "";
        return (
          <div className="card" key={r.id}>
            <div className="row">
              <strong>{r.name}</strong>
              <span className={diff < 0 ? "late" : "muted"}>
                {diff < 0 ? `venceu ha ${-diff}d` : diff === 0 ? "vence hoje" : `vence em ${diff}d`}
              </span>
            </div>
            <div className="muted">{r.label}{r.btu ? ` ${r.btu.toLocaleString("pt-BR")} BTU` : ""} · {formatBR(r.due_on)}</div>
            {href ? <WhatsAppButton id={r.id} href={href} /> : <p className="err">Cliente sem telefone valido.</p>}
          </div>
        );
      })}

      {bookings.length > 0 && (
        <>
          <h1 style={{ marginTop: 24 }}>Pedidos de agendamento</h1>
          {bookings.map((b) => (
            <div className="card" key={b.id}>
              <div className="row"><strong>{b.name}</strong><span className="muted">{b.preferred_period ?? ""}</span></div>
              {b.phone_e164 && <a className="btn ghost" href={`https://wa.me/${b.phone_e164}`} target="_blank" rel="noopener noreferrer">Chamar no WhatsApp</a>}
            </div>
          ))}
        </>
      )}
    </>
  );
}
