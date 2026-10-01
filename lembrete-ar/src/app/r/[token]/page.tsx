import { pool } from "@/lib/db";
import { formatBR } from "@/lib/dates";
import PublicActions from "@/components/PublicActions";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function PaginaPublica({ params }: { params: { token: string } }) {
  const t = params.token;
  const row = /^[0-9a-f]{64}$/.test(t)
    ? (await pool.query(
        `select r.responded_at, r.expires_at, e.label, e.last_service_on::text as last, a.name as empresa
           from reminders r join equipment e on e.id=r.equipment_id join accounts a on a.id=r.account_id
          where r.token=$1`, [t])).rows[0]
    : null;

  if (!row || new Date(row.expires_at) < new Date())
    return <div className="center"><div className="card"><p>Este link expirou ou nao existe.</p></div></div>;

  return (
    <div className="center">
      <h1>{row.empresa}</h1>
      <div className="card">
        <p>Ola! Esta na hora da manutencao do seu <strong>{row.label}</strong>.</p>
        {row.last && <p className="muted">Ultimo servico: {formatBR(row.last)}</p>}
      </div>
      {row.responded_at ? <div className="card"><p>Recebemos sua resposta. Obrigado!</p></div> : <PublicActions token={t} tipo="limpeza" />}
    </div>
  );
}
