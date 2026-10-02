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
    created_at timestamptz not null default now()
);

create index if not exists nodes_session_seq_idx on continumai.nodes (session_id, seq);
create index if not exists nodes_session_checkpoint_idx on continumai.nodes (session_id, seq) where type = 'checkpoint';

alter table continumai.nodes enable row level security;

do $$
declare
    r record;
begin
    for r in select rolname from pg_roles where rolname in ('anon','authenticated','service_role') loop
        execute format('revoke all on schema continumai from %I', r.rolname);
        execute format('revoke all on all tables in schema continumai from %I', r.rolname);
    end loop;
end $$;