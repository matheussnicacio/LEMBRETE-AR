-- Modelo de dados v0.1 (topico 5 do System Design)
create extension if not exists pgcrypto;

create table accounts (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  contact_whatsapp   text,
  plan               text not null default 'free'
                     check (plan in ('free','essencial','pro','ilimitado')),
  plan_status        text not null default 'active'
                     check (plan_status in ('active','past_due','canceled')),
  asaas_customer_id  text,
  wa_template        text not null default
    'Ola, {nome}! Aqui e da {empresa}. Ja faz um tempo da manutencao do seu {equipamento}. Para agendar ou ver detalhes, toque aqui: {link}',
  timezone           text not null default 'America/Sao_Paulo',
  created_at         timestamptz not null default now()
);

create table users (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  email       text not null,
  name        text,
  role        text not null default 'owner' check (role in ('owner','tech')),
  created_at  timestamptz not null default now()
);
create unique index users_email_uq on users (lower(email));
create index users_account_idx on users (account_id);

create table customers (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references accounts(id) on delete cascade,
  name            text not null,
  phone_e164      text,
  email           text,
  neighborhood    text,
  consent_status  text not null default 'unknown'
                  check (consent_status in ('granted','unknown','revoked')),
  consent_at      timestamptz,
  consent_source  text,
  opt_out_token   text not null unique default encode(gen_random_bytes(32), 'hex'),
  notes           text,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index customers_account_idx on customers (account_id, active);

create table equipment (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references accounts(id) on delete cascade,
  customer_id      uuid not null references customers(id) on delete cascade,
  label            text not null,
  type             text not null default 'split'
                   check (type in ('split','janela','piso-teto','cassete','central')),
  btu              integer,
  brand            text,
  interval_days    integer not null check (interval_days between 7 and 1095),
  last_service_on  date,
  next_due_on      date,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);
create index equipment_due_idx on equipment (account_id, next_due_on);
create index equipment_customer_idx on equipment (customer_id);

create table services (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references accounts(id) on delete cascade,
  equipment_id  uuid not null references equipment(id) on delete cascade,
  performed_on  date not null,
  kind          text not null default 'limpeza'
                check (kind in ('limpeza','higienizacao','preventiva','corretiva','instalacao')),
  price_cents   integer check (price_cents is null or price_cents >= 0),
  notes         text,
  user_id       uuid references users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index services_equipment_idx on services (equipment_id, performed_on desc);
create index services_account_idx on services (account_id, performed_on desc);

create table reminders (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references accounts(id) on delete cascade,
  equipment_id  uuid not null references equipment(id) on delete cascade,
  due_on        date not null,  -- snapshot do vencimento do ciclo
  kind          text not null check (kind in ('d-10','d0','d+15')),
  channel       text not null check (channel in ('email','whatsapp_manual','whatsapp_api')),
  status        text not null default 'pending'
                check (status in ('pending','sent','failed','skipped')),
  scheduled_for timestamptz not null,
  sent_at       timestamptz,
  attempts      integer not null default 0,
  last_error    text,
  token         text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at    timestamptz not null default (now() + interval '90 days'),
  responded_at  timestamptz,
  created_at    timestamptz not null default now(),
  -- impede envio duplicado mesmo se o worker reiniciar
  unique (equipment_id, due_on, kind, channel)
);
create index reminders_queue_idx on reminders (status, scheduled_for);
create index reminders_account_idx on reminders (account_id, status);

create table booking_requests (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references accounts(id) on delete cascade,
  reminder_id      uuid references reminders(id) on delete set null,
  customer_id      uuid not null references customers(id) on delete cascade,
  status           text not null default 'new'
                   check (status in ('new','contacted','scheduled','done','declined')),
  preferred_period text,
  decline_reason   text,
  created_at       timestamptz not null default now(),
  handled_at       timestamptz
);
create index booking_account_idx on booking_requests (account_id, status);
create index booking_reminder_idx on booking_requests (reminder_id);

create table push_subscriptions (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references users(id) on delete cascade,
  endpoint  text not null unique,
  keys      jsonb not null,
  created_at timestamptz not null default now()
);

create table audit_log (
  id          bigserial primary key,
  account_id  uuid references accounts(id) on delete cascade,
  actor       text not null,
  action      text not null,
  meta        jsonb,
  at          timestamptz not null default now()
);
create index audit_account_idx on audit_log (account_id, at desc);

-- Batimento do worker (alerta se ficar > 1h sem tick)
create table worker_heartbeat (
  id       integer primary key default 1 check (id = 1),
  last_tick timestamptz not null default now()
);
insert into worker_heartbeat (id) values (1);
