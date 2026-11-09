-- Portal Nacional · IEANJESÚS Uruguay · Base central en Supabase
-- Se pega completo en Supabase → SQL Editor → Run. Se puede volver a ejecutar sin perder datos.
--
-- Cómo está guardado: cada ficha del Portal (persona, culto, movimiento, informe…) es una fila de
-- "records" con su contenido en "body". Las columnas church_id y committee_key dicen a qué
-- congregación y a qué comité pertenece, y las reglas de acceso (RLS) usan esas columnas para que:
--   · la Administración Nacional vea y cargue todo;
--   · cada pastor, secretaría o tesorería vea solo su congregación;
--   · cada comité nacional vea sus actividades y los pedidos que mandó a las iglesias.

-- 1. Tablas -------------------------------------------------------------------------------------

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  space_type text not null check (space_type in ('national_admin', 'national_committee', 'church', 'preaching_place')),
  church_id text,          -- id de la congregación (fila de records con collection = 'churches')
  committee_key text,      -- jovenes, damas, musica, misiones, caballeros, escuela_dominical, comunicaciones…
  role text not null default 'Pastor',
  display_name text,
  created_at timestamptz not null default now()
);
create index if not exists memberships_user_idx on public.memberships (user_id);

create table if not exists public.records (
  id text primary key,
  collection text not null,
  church_id text,
  committee_key text,
  body jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists records_collection_idx on public.records (collection);
create index if not exists records_church_idx on public.records (church_id);
create index if not exists records_committee_idx on public.records (committee_key);

create table if not exists public.audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid,
  action text not null,
  collection text,
  record_id text
);

-- 2. Permisos del usuario conectado ---------------------------------------------------------------
-- "security definer" para leer memberships sin pasar por sus propias reglas.

create or replace function public.is_national_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where user_id = auth.uid() and space_type = 'national_admin')
$$;

create or replace function public.my_church_ids() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(church_id), '{}') from memberships where user_id = auth.uid() and church_id is not null
$$;

create or replace function public.my_committee_keys() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(committee_key), '{}') from memberships where user_id = auth.uid() and committee_key is not null
$$;

-- Personas que integran un comité del usuario (para ver sus líderes en cada iglesia).
create or replace function public.my_committee_people() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(body->>'personId'), '{}') from records
  where collection = 'committeeMembers' and committee_key = any (my_committee_keys())
$$;

-- 3. Reglas de acceso (RLS) -----------------------------------------------------------------------

alter table public.memberships enable row level security;
alter table public.records enable row level security;
alter table public.audit enable row level security;

drop policy if exists memberships_read on public.memberships;
create policy memberships_read on public.memberships for select to authenticated
  using (user_id = auth.uid() or is_national_admin());

drop policy if exists memberships_admin on public.memberships;
create policy memberships_admin on public.memberships for all to authenticated
  using (is_national_admin()) with check (is_national_admin());

drop policy if exists records_read on public.records;
create policy records_read on public.records for select to authenticated using (
  is_national_admin()
  or church_id = any (my_church_ids())
  or committee_key = any (my_committee_keys())
  -- Lo nacional lo ven todos: congregaciones, actividades de comités y eventos nacionales.
  or collection in ('churches', 'nationalActivities')
  or (church_id is null and collection in ('events', 'groups'))
  or (collection = 'people' and id = any (my_committee_people()))
);

drop policy if exists records_insert on public.records;
create policy records_insert on public.records for insert to authenticated with check (
  is_national_admin()
  or church_id = any (my_church_ids())
  or committee_key = any (my_committee_keys())
);

drop policy if exists records_update on public.records;
create policy records_update on public.records for update to authenticated
  using (is_national_admin() or church_id = any (my_church_ids()) or committee_key = any (my_committee_keys()))
  with check (is_national_admin() or church_id = any (my_church_ids()) or committee_key = any (my_committee_keys()));

drop policy if exists records_delete on public.records;
create policy records_delete on public.records for delete to authenticated using (is_national_admin());

drop policy if exists audit_read on public.audit;
create policy audit_read on public.audit for select to authenticated using (is_national_admin());

-- 4. Historial de cambios (quién creó o cambió cada ficha) ----------------------------------------

create or replace function public.log_record_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit (user_id, action, collection, record_id)
  values (auth.uid(), lower(tg_op), coalesce(new.collection, old.collection), coalesce(new.id, old.id));
  return coalesce(new, old);
end $$;

drop trigger if exists records_audit on public.records;
create trigger records_audit after insert or update or delete on public.records
  for each row execute function public.log_record_change();

-- 5. Usuarios y permisos desde el Portal (Configuración → Usuarios) -----------------------------
-- Cada persona crea su usuario con "Crear mi usuario"; la Administración Nacional le asigna su espacio.

create or replace function public.assign_membership(
  p_email text, p_space_type text, p_church_id text, p_committee_key text, p_role text, p_display_name text
) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_user uuid;
begin
  if not is_national_admin() then raise exception 'Solo la Administración Nacional puede dar permisos.'; end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then raise exception 'Ese correo todavía no creó su usuario en el Portal.'; end if;
  insert into memberships (user_id, space_type, church_id, committee_key, role, display_name)
  values (v_user, p_space_type, nullif(p_church_id, ''), nullif(p_committee_key, ''), coalesce(nullif(p_role, ''), 'Pastor'), nullif(p_display_name, ''));
end $$;

create or replace function public.list_memberships()
returns table (id uuid, email text, space_type text, church_id text, committee_key text, role text, display_name text)
language sql stable security definer set search_path = public, auth as $$
  select m.id, u.email::text, m.space_type, m.church_id, m.committee_key, m.role, m.display_name
  from memberships m join auth.users u on u.id = m.user_id
  where is_national_admin()
  order by u.email
$$;

revoke execute on function public.assign_membership(text, text, text, text, text, text) from anon;
revoke execute on function public.list_memberships() from anon;

-- 6. Primer administrador ------------------------------------------------------------------------
-- Después de crear tu usuario en Authentication → Users, cambiá el correo y ejecutá:
--
-- insert into public.memberships (user_id, space_type, role, display_name)
-- select id, 'national_admin', 'Administración Nacional', 'Tu nombre'
-- from auth.users where email = 'tu-correo@gmail.com';
--
-- Para habilitar a un pastor (primero registrá la congregación en el Portal):
--
-- insert into public.memberships (user_id, space_type, church_id, role, display_name)
-- select u.id, 'church', r.id, 'Pastor', 'Pastor de Maldonado'
-- from auth.users u, public.records r
-- where u.email = 'pastor.maldonado@gmail.com'
--   and r.collection = 'churches' and r.body->>'name' = 'Congregación Maldonado';
--
-- Para un comité nacional:
--
-- insert into public.memberships (user_id, space_type, committee_key, role, display_name)
-- select id, 'national_committee', 'jovenes', 'Presidente', 'Comité de Jóvenes'
-- from auth.users where email = 'jovenes@gmail.com';
