-- Editable homepage signature banner content
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  signature_eyebrow text not null default 'COLLECTION SIGNATURE',
  signature_title text not null default 'Œil de Tigre',
  signature_image_url text not null default 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1100&q=85',
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;
drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings" on public.site_settings
for select to anon, authenticated using (true);
drop policy if exists "Admins manage site settings" on public.site_settings;
create policy "Admins manage site settings" on public.site_settings
for all to authenticated using (public.is_admin()) with check (public.is_admin());
insert into public.site_settings (id) values (1) on conflict (id) do nothing;
