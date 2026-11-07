create schema if not exists continumai;

create table if not exists continumai.nodes (
    seq bigint generated always as identity primary key,
    node_id uuid not null unique,
    session_id text not null,
    prev_id uuid null,
    type text not null check (type in ('turn','decision','checkpoint')),
    content text not null default '',
    reply text null,
    model_used text not null default '',
    status_at_this_point text not null check (status_at_this_point in ('in_progress','blocked','done')),
    refs jsonb null,
    provider text null,
    failed_providers text[] not null default '{}',
    created_at timestamptz not null default now()
);

alter table continumai.nodes add column if not exists provider text null;
alter table continumai.nodes add column if not exists failed_providers text[] not null default '{}';

create index if not exists nodes_session_seq_idx on continumai.nodes (session_id, seq);
create index if not exists nodes_session_checkpoint_idx on continumai.nodes (session_id, seq) where type = 'checkpoint';

alter table continumai.nodes enable row level security;

create table if not exists continumai.provider_keys (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    name text not null check (name ~ '^[a-z0-9_-]{1,32}$'),
    kind text not null check (kind in ('openai','gemini','claude','nvidia','openai_compat')),
    label text not null default '',
    key_ciphertext text not null,
    key_last4 text not null,
    model text not null default '',
    base_url text null,
    priority integer not null default 100 check (priority between 1 and 100000),
    enabled boolean not null default true,
    last_tested_at timestamptz null,
    last_test_ok boolean null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, name)
);
alter table continumai.provider_keys enable row level security;
create index if not exists provider_keys_user_idx on continumai.provider_keys (user_id, priority);

do $$
declare
    r record;
begin
    for r in select rolname from pg_roles where rolname in ('anon','authenticated','service_role') loop
        execute format('revoke all on schema continumai from %I', r.rolname);
        execute format('revoke all on all tables in schema continumai from %I', r.rolname);
    end loop;
end $$;

alter table continumai.nodes add column if not exists user_id uuid;

create index if not exists nodes_user_session_idx on continumai.nodes (user_id, session_id, seq);
