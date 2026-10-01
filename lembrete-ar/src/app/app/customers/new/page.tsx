import { INTERVAL_TEMPLATES, EQUIPMENT_TYPES } from "@/lib/templates";

export default function NovoCliente({ searchParams }: { searchParams: { erro?: string } }) {
  return (
    <>
      <h1>Novo cliente</h1>
      <form method="POST" action="/api/customers" className="card">
        <label htmlFor="name">Nome</label>
        <input id="name" name="name" required />
        <label htmlFor="phone">WhatsApp (com DDD)</label>
        <input id="phone" name="phone" inputMode="tel" required placeholder="(11) 99999-8888" />
        {searchParams.erro === "telefone" && <p className="err">Telefone invalido.</p>}
        <label htmlFor="last_service_on">Data do ultimo servico</label>
        <input id="last_service_on" name="last_service_on" type="date" />
        <label htmlFor="interval_days">Intervalo de manutencao</label>
        <select id="interval_days" name="interval_days" defaultValue="182">
          {INTERVAL_TEMPLATES.map((t) => <option key={t.id} value={t.days}>{t.label}</option>)}
        </select>
        <label htmlFor="label">Equipamento</label>
        <input id="label" name="label" defaultValue="Split sala" />
        <label htmlFor="type">Tipo</label>
        <select id="type" name="type">{EQUIPMENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <label htmlFor="btu">BTU (opcional)</label>
        <input id="btu" name="btu" type="number" inputMode="numeric" />
        <label htmlFor="email">E-mail (opcional)</label>
        <input id="email" name="email" type="email" />
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 400 }}>
          <input type="checkbox" name="consent" value="1" style={{ width: "auto" }} />
          Tenho autorizacao deste cliente para contato
        </label>
        <button className="btn" type="submit">Salvar</button>
      </form>
    </>
  );
}
