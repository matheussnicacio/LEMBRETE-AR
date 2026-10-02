import Link from "next/link";
import { notFound } from "next/navigation";
import { scoped } from "@/lib/db";
import { requireSession } from "@/lib/session";
import EmailComposer from "@/components/EmailComposer";

export const dynamic = "force-dynamic";

export default async function EnviarEmail({ params, searchParams }: { params: { id: string }; searchParams: { erro?: string } }) {
  const s = requireSession();
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const db = scoped(s.accountId);
  const c = (await db.q("select id, name, email, consent_status from customers where account_id=$1 and id=$2 and active", [params.id])).rows[0];
  if (!c) notFound();
  const empresa = (await db.q("select name from accounts where id=$1")).rows[0].name as string;
  const equip = (await db.q("select label from equipment where account_id=$1 and customer_id=$2 and active order by created_at limit 1", [params.id])).rows[0]?.label ?? "ar-condicionado";
  const nome = (c.name as string).split(" ")[0];

  const templates = [
    {
      id: "lembrete", label: "Lembrete de manutencao",
      subject: "Hora da manutencao do seu ar-condicionado",
      body: `Ola, ${nome}!\n\nFaz um tempo desde a ultima manutencao do seu ${equip}. A limpeza periodica evita mau cheiro, melhora o desempenho e reduz o consumo de energia.\n\nQuer agendar? Basta responder este e-mail com o melhor dia e periodo.\n\nUm abraco,\n${empresa}`,
    },
    {
      id: "confirmacao", label: "Confirmar agendamento",
      subject: "Confirmacao da sua visita tecnica",
      body: `Ola, ${nome}!\n\nConfirmando nossa visita para [dia e horario] para a manutencao do seu ${equip}.\n\nSe precisar remarcar, e so responder este e-mail.\n\nAte la!\n${empresa}`,
    },
    {
      id: "obrigado", label: "Agradecimento",
      subject: "Obrigado por escolher a " + empresa,
      body: `Ola, ${nome}!\n\nObrigado por confiar na ${empresa}. O servico no seu ${equip} foi concluido. Se notar qualquer coisa diferente, e so nos avisar por aqui.\n\nVamos te lembrar quando chegar a hora da proxima manutencao.\n\nUm abraco,\n${empresa}`,
    },
    { id: "branco", label: "Em branco", subject: "", body: `Ola, ${nome}!\n\n` },
  ];

  const testMode = !process.env.RESEND_API_KEY;
  const sandboxFrom = !process.env.EMAIL_FROM || process.env.EMAIL_FROM.includes("resend.dev");

  return (
    <>
      <Link href={`/app/customers/${c.id}`} className="back">‹ {c.name}</Link>
      <h1>Enviar e-mail</h1>

      {!c.email ? (
        <div className="card">
          <p style={{ marginTop: 0 }}>Este cliente ainda nao tem e-mail cadastrado.</p>
          <form method="POST" action={`/api/customers/${c.id}/set-email`}>
            <label htmlFor="email">E-mail do cliente</label>
            <input id="email" name="email" type="email" required placeholder="cliente@email.com" />
            {searchParams.erro === "email" && <p className="err">E-mail invalido.</p>}
            <button className="btn" type="submit">Salvar e-mail</button>
          </form>
        </div>
      ) : c.consent_status === "revoked" ? (
        <div className="card"><p style={{ margin: 0 }}>Este cliente pediu para nao receber mais mensagens, entao o envio esta bloqueado.</p></div>
      ) : (
        <>
          {testMode && <div className="card"><p className="muted" style={{ margin: 0 }}><strong>Modo teste:</strong> o servidor esta sem RESEND_API_KEY, entao os e-mails nao saem de verdade (aparecem so no terminal).</p></div>}
          {!testMode && sandboxFrom && <div className="card"><p className="muted" style={{ margin: 0 }}><strong>Remetente de testes:</strong> com onboarding@resend.dev o Resend so entrega para o e-mail da sua conta. Para enviar a clientes, verifique um dominio seu no Resend e ajuste o EMAIL_FROM.</p></div>}
          <div className="card">
            <div className="row"><span className="muted">Para</span><span>{c.name} &lt;{c.email}&gt;</span></div>
            <div className="row"><span className="muted">Respostas vao para</span><span>seu e-mail de login</span></div>
          </div>
          <EmailComposer customerId={c.id} templates={templates} />
        </>
      )}
    </>
  );
}
