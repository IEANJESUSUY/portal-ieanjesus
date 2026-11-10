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

-- Rol del usuario en una congregación (si tiene varios, el de más permiso).
--   Pastor: todo · Secretaría: todo menos los diezmos · Tesorería: solo dinero e informes.
create or replace function public.role_kind(p_role text) returns text
language sql immutable as $$
  select case when p_role ilike 'tesor%' then 'tesoreria' when p_role ilike 'secret%' then 'secretaria' else 'full' end
$$;

create or replace function public.church_role(p_church text) returns text
language sql stable security definer set search_path = public as $$
  select role from memberships where user_id = auth.uid() and church_id = p_church
  order by case role_kind(role) when 'full' then 0 when 'secretaria' then 1 else 2 end limit 1
$$;

create or replace function public.church_can_read(p_church text, p_collection text, p_body jsonb) returns boolean
language sql stable security definer set search_path = public as $$
  select case role_kind(church_role(p_church))
    when 'tesoreria' then p_collection in ('transactions', 'monthlyReports', 'churches', 'events', 'groups', 'serviceSchedules', 'activityAssignments')
    when 'secretaria' then not (p_collection = 'transactions' and p_body->>'category' = 'Diezmo')
    else true end
$$;

create or replace function public.church_can_write(p_church text, p_collection text, p_body jsonb) returns boolean
language sql stable security definer set search_path = public as $$
  select case role_kind(church_role(p_church))
    when 'tesoreria' then p_collection = 'transactions'
    when 'secretaria' then p_collection <> 'churches' and not (p_collection = 'transactions' and p_body->>'category' = 'Diezmo')
    else true end
$$;

-- El pastor (o Nacional) administra las cuentas de Secretaría y Tesorería de su iglesia.
create or replace function public.can_manage_church(p_church text) returns boolean
language sql stable security definer set search_path = public as $$
  select is_national_admin() or exists (
    select 1 from memberships where user_id = auth.uid() and church_id = p_church and role ilike 'pastor%'
  )
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
  or (church_id = any (my_church_ids()) and church_can_read(church_id, collection, body))
  or committee_key = any (my_committee_keys())
  -- Lo nacional lo ven todos: congregaciones, actividades de comités y eventos nacionales.
  or collection in ('churches', 'nationalActivities')
  or (church_id is null and collection in ('events', 'groups'))
  or (collection = 'people' and id = any (my_committee_people()))
);

drop policy if exists records_insert on public.records;
create policy records_insert on public.records for insert to authenticated with check (
  is_national_admin()
  or (church_id = any (my_church_ids()) and church_can_write(church_id, collection, body))
  or committee_key = any (my_committee_keys())
);

drop policy if exists records_update on public.records;
create policy records_update on public.records for update to authenticated
  using (
    is_national_admin()
    or (church_id = any (my_church_ids()) and church_can_write(church_id, collection, body))
    or committee_key = any (my_committee_keys())
  )
  with check (
    is_national_admin()
    or (church_id = any (my_church_ids()) and church_can_write(church_id, collection, body))
    or committee_key = any (my_committee_keys())
  );

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

-- 5. Fotos (almacenamiento de archivos) -----------------------------------------------------------
-- Las fotos no van adentro de la base: se guardan como archivos en el bucket "fotos", en carpetas
-- <congregación>/<comité>/<archivo>.webp, y en la base queda solo la referencia. Así la base es
-- liviana y cada foto se descarga recién cuando alguien la mira. El bucket es privado: se ve con
-- enlaces temporales y solo quien tiene permiso sobre esa congregación o ese comité.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = 2097152,
  allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

drop policy if exists fotos_read on storage.objects;
create policy fotos_read on storage.objects for select to authenticated using (
  bucket_id = 'fotos' and (
    is_national_admin()
    or (storage.foldername(name))[1] = any (my_church_ids())
    or (storage.foldername(name))[2] = any (my_committee_keys())
  )
);

drop policy if exists fotos_insert on storage.objects;
create policy fotos_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'fotos' and (
    is_national_admin()
    or (storage.foldername(name))[1] = any (my_church_ids())
    or (storage.foldername(name))[2] = any (my_committee_keys())
  )
);

drop policy if exists fotos_delete on storage.objects;
create policy fotos_delete on storage.objects for delete to authenticated using (bucket_id = 'fotos' and is_national_admin());

-- 6. Cuentas y permisos desde el Portal (Configuración → Usuarios y permisos) --------------------
-- Pastores y Nacional entran con su correo (cada uno crea su usuario con "Es mi primera vez").
-- Secretaría, Tesorería y comités tienen cuentas con usuario (secretaria.maldonado), que no dependen de
-- una persona: las crea Nacional (o el pastor, las de su iglesia) y les pone o cambia la contraseña.
-- Por dentro, esas cuentas son usuario@cuentas.ieanjesus.uy, una dirección que no recibe correos.

create or replace function public.assign_membership(
  p_email text, p_space_type text, p_church_id text, p_committee_key text, p_role text, p_display_name text
) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_user uuid;
begin
  if not (
    is_national_admin()
    or (p_space_type in ('church', 'preaching_place') and role_kind(p_role) in ('secretaria', 'tesoreria') and can_manage_church(p_church_id))
  ) then
    raise exception 'No tenés permiso para dar ese acceso.';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then raise exception 'Ese correo o usuario todavía no existe en el Portal.'; end if;
  insert into memberships (user_id, space_type, church_id, committee_key, role, display_name)
  values (v_user, p_space_type, nullif(p_church_id, ''), nullif(p_committee_key, ''), coalesce(nullif(p_role, ''), 'Pastor'), nullif(p_display_name, ''));
end $$;

create or replace function public.list_memberships()
returns table (id uuid, email text, space_type text, church_id text, committee_key text, role text, display_name text)
language sql stable security definer set search_path = public, auth as $$
  select m.id, u.email::text, m.space_type, m.church_id, m.committee_key, m.role, m.display_name
  from memberships m join auth.users u on u.id = m.user_id
  where is_national_admin() or (m.church_id is not null and can_manage_church(m.church_id))
  order by m.church_id, u.email
$$;

create or replace function public.remove_membership(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_member memberships;
begin
  select * into v_member from memberships where id = p_id;
  if v_member.id is null then return; end if;
  if not (is_national_admin() or (role_kind(v_member.role) in ('secretaria', 'tesoreria') and can_manage_church(v_member.church_id))) then
    raise exception 'No tenés permiso para quitar ese acceso.';
  end if;
  delete from memberships where id = p_id;
end $$;

create or replace function public.set_account_password(p_email text, p_password text) returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
declare v_user uuid;
begin
  if length(coalesce(p_password, '')) < 8 then raise exception 'La contraseña tiene que tener al menos 8 letras o números.'; end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then raise exception 'No existe esa cuenta.'; end if;
  -- Nacional cambia cualquiera; el pastor, solo las cuentas de Secretaría y Tesorería de su iglesia.
  if not (
    is_national_admin()
    or (lower(p_email) like '%@cuentas.ieanjesus.uy' and exists (
      select 1 from memberships m where m.user_id = v_user and role_kind(m.role) in ('secretaria', 'tesoreria') and can_manage_church(m.church_id)
    ))
  ) then
    raise exception 'No podés cambiar la contraseña de esa cuenta.';
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now() where id = v_user;
end $$;

revoke execute on function public.assign_membership(text, text, text, text, text, text) from anon;
revoke execute on function public.list_memberships() from anon;
revoke execute on function public.remove_membership(uuid) from anon;
revoke execute on function public.set_account_password(text, text) from anon;

-- 7. Primer administrador ------------------------------------------------------------------------
-- Es lo único que se hace con SQL. Creá tu usuario en el Portal ("Es mi primera vez"), cambiá el correo
-- de abajo por el tuyo y ejecutá. Todo lo demás (pastores, secretarías, tesorerías, comités) se hace
-- desde el Portal: Configuración → Usuarios y permisos.
--
-- insert into public.memberships (user_id, space_type, role, display_name)
-- select id, 'national_admin', 'Administración Nacional', 'Tu nombre'
-- from auth.users where email = 'tu-correo@gmail.com';
