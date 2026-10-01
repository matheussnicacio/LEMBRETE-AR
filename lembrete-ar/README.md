# Lembrete de retorno (ar-condicionado) - v0.1

Monolito Next.js + worker + Postgres (System Design v0.1, topicos 1 a 5).

## O que ja esta pronto
- **Topico 4 (arquitetura):** Docker Compose com `caddy`, `app`, `worker` (mesma imagem) e `postgres`; migracoes no startup; `/api/health` com batimento do worker.
- **Topico 5 (modelo de dados):** `db/migrations/001_init.sql` com accounts, users, customers, equipment, services, reminders (unique anti-duplicidade), booking_requests, push_subscriptions, audit_log. Indices `(account_id, next_due_on)` e `(status, scheduled_for)`.
  Acrescimos ao desenho: `reminders.attempts/last_error/expires_at/responded_at` (retry, expiracao de 90 dias, uso unico) e `worker_heartbeat`.
- **Regras (topico 6):** proximo vencimento, gatilhos d-10/d0/d+15, janela seg-sab 8h-18h no fuso da conta, consentimento/opt-out, cancelamento de lembretes ao registrar servico. Testes em `tests/`.
- **Telas:** Hoje (wa.me com mensagem pronta), Clientes, Novo cliente (3 campos + equipamento), Servico feito, pagina publica `/r/{token}`, descadastro `/o/{token}`. PWA com manifest + service worker minimo.
- **Worker:** tick de 15 min gera lembretes (idempotente) e envia e-mails com ate 3 novas tentativas (espera crescente).

## Ainda NAO feito (proximas semanas)
- Auth real (Google + magic link). Hoje existe login so por e-mail, controlado por `AUTH_DEV_LOGIN=true` - **nunca ligar em producao**. Troque `src/lib/session.ts` / rota `dev-login` por Auth.js ou Better Auth.
- Importacao por colagem de planilha, tela de cliente com historico, painel Retornos, Configuracoes.
- Resumo diario as 8h (e-mail + Web Push), Asaas, backups, Sentry.

## Rodar local
```bash
docker compose -f docker-compose.dev.yml up -d      # so o Postgres
cp .env.example .env.local
# ajuste DATABASE_URL=postgres://lembrete:lembrete@localhost:5432/lembrete e APP_URL=http://localhost:3000
export $(grep -v '^#' .env.local | xargs)
npm install
npm run migrate
npm run dev            # terminal 1
npm run worker         # terminal 2
npm test
```

## Producao (VPS)
```bash
cp .env.example .env   # preencher senhas, DOMAIN, APP_URL, SESSION_SECRET; AUTH_DEV_LOGIN=false
docker compose up -d --build
```
Todo acesso a dados de conta passa por `scoped(accountId)` (`src/lib/db.ts`), que injeta `account_id` como `$1`.
