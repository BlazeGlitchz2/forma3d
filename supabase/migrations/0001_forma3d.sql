-- Forma3D initial schema (Postgres/Supabase).
-- Mirrors the Cloudflare D1 schema in site/db/schema.ts, with epoch-millis
-- timestamps stored as double precision so they come back as JS numbers.
-- Apply once: Supabase dashboard -> SQL Editor -> paste & run.

create table if not exists catalog (
  id text primary key,
  data text not null,
  type text not null
);

create table if not exists uploads (
  id text primary key,
  owner text not null,
  object_key text not null,
  name text not null,
  stats text not null,
  bytes integer not null,
  created double precision not null
);
create index if not exists uploads_owner on uploads(owner);

create table if not exists orders (
  id text primary key,
  owner text not null,
  user_id text,
  secret text not null,
  customer text not null,
  phone text not null,
  fulfillment text not null,
  area text not null,
  notes text not null,
  items text not null,
  quote text not null,
  total double precision not null,
  status text not null,
  payment_status text not null default 'unpaid',
  payment_location text not null default 'huwaylat',
  paid_amount double precision not null default 0,
  payment_reference text,
  paid_at double precision,
  paid_by text,
  created double precision not null,
  updated double precision not null,
  version integer not null default 1
);
create index if not exists orders_owner on orders(owner);
create index if not exists orders_user on orders(user_id);
create index if not exists orders_created on orders(created);
create index if not exists orders_status on orders(status);

create table if not exists history (
  id serial primary key,
  order_id text not null references orders(id),
  status text not null,
  message text not null,
  created double precision not null
);
create index if not exists history_order on history(order_id);

create table if not exists limits (
  id text primary key,
  count integer not null,
  expires double precision not null
);

create table if not exists quote_snapshots (
  id text primary key,
  data text not null,
  created double precision not null
);

create table if not exists users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  name text not null,
  phone text not null default '',
  area text not null default '',
  role text not null default 'customer',
  created double precision not null,
  updated double precision not null
);
create index if not exists users_email on users(email);
create index if not exists users_role on users(role);

create table if not exists sessions (
  id text primary key,
  user_id text not null references users(id),
  token text not null unique,
  expires double precision not null,
  created double precision not null
);
create index if not exists sessions_user_id on sessions(user_id);
create index if not exists sessions_token on sessions(token);
create index if not exists sessions_expires on sessions(expires);

create table if not exists tickets (
  id text primary key,
  user_id text references users(id),
  name text not null,
  email text not null,
  phone text not null default '',
  order_id text references orders(id),
  subject text not null,
  message text not null,
  status text not null default 'open',
  response text,
  created double precision not null,
  updated double precision not null
);
create index if not exists tickets_user_id on tickets(user_id);
create index if not exists tickets_status on tickets(status);
create index if not exists tickets_created on tickets(created);
