-- Historico de e-mails enviados manualmente pelo sistema (tela "Enviar e-mail" do cliente)
create table email_messages (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references accounts(id) on delete cascade,
  customer_id  uuid not null references customers(id) on delete cascade,
  user_id      uuid references users(id) on delete set null,
  to_email     text not null,
  subject      text not null,
  body         text not null,
  status       text not null check (status in ('sent','failed','simulated')),
  provider_id  text,
  error        text,
  created_at   timestamptz not null default now()
);
create index email_messages_customer_idx on email_messages (customer_id, created_at desc);
create index email_messages_account_idx  on email_messages (account_id, created_at desc);
