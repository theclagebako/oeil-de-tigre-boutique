-- Zandonova RLS hardening: avoid a publicly executable admin helper and scope reads by role.
drop policy if exists "zando categories public read" on public.zando_categories;
drop policy if exists "zando categories authenticated read" on public.zando_categories;
drop policy if exists "zando categories admin manage" on public.zando_categories;
drop policy if exists "zando categories admin insert" on public.zando_categories;
drop policy if exists "zando categories admin update" on public.zando_categories;
drop policy if exists "zando categories admin delete" on public.zando_categories;
drop policy if exists "zando products public published read" on public.zando_products;
drop policy if exists "zando products authenticated read" on public.zando_products;
drop policy if exists "zando products admin manage" on public.zando_products;
drop policy if exists "zando products admin insert" on public.zando_products;
drop policy if exists "zando products admin update" on public.zando_products;
drop policy if exists "zando products admin delete" on public.zando_products;
drop policy if exists "zando orders admin read" on public.zando_orders;
drop policy if exists "zando orders admin update" on public.zando_orders;
drop policy if exists "zando order items admin read" on public.zando_order_items;
drop policy if exists "zando cover images public read" on storage.objects;
drop policy if exists "zando admins manage covers" on storage.objects;
drop policy if exists "zando admins manage ebook files" on storage.objects;
drop policy if exists "zando storage authenticated read" on storage.objects;
drop policy if exists "zando admins insert storage" on storage.objects;
drop policy if exists "zando admins update storage" on storage.objects;
drop policy if exists "zando admins delete storage" on storage.objects;
drop function if exists public.zando_is_admin();

create policy "zando categories public read" on public.zando_categories for select to anon using (true);
create policy "zando categories authenticated read" on public.zando_categories for select to authenticated using (true);
create policy "zando categories admin insert" on public.zando_categories for insert to authenticated with check (exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid())));
create policy "zando categories admin update" on public.zando_categories for update to authenticated using (exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid()))) with check (exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid())));
create policy "zando categories admin delete" on public.zando_categories for delete to authenticated using (exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid())));

create policy "zando products public published read" on public.zando_products for select to anon using (is_published = true);
create policy "zando products authenticated read" on public.zando_products for select to authenticated using (is_published = true or exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid())));
create policy "zando products admin insert" on public.zando_products for insert to authenticated with check (exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid())));
create policy "zando products admin update" on public.zando_products for update to authenticated using (exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid()))) with check (exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid())));
create policy "zando products admin delete" on public.zando_products for delete to authenticated using (exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid())));

create policy "zando orders admin read" on public.zando_orders for select to authenticated using (exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid())));
create policy "zando orders admin update" on public.zando_orders for update to authenticated using (exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid()))) with check (exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid())));
create policy "zando order items admin read" on public.zando_order_items for select to authenticated using (exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid())));

create policy "zando cover images public read" on storage.objects for select to anon using (bucket_id = 'zandonova-covers');
create policy "zando storage authenticated read" on storage.objects for select to authenticated using (
  bucket_id = 'zandonova-covers' or
  (bucket_id = 'zandonova-ebooks' and exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid())))
);
create policy "zando admins insert storage" on storage.objects for insert to authenticated with check (
  bucket_id in ('zandonova-covers','zandonova-ebooks') and exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid()))
);
create policy "zando admins update storage" on storage.objects for update to authenticated using (
  bucket_id in ('zandonova-covers','zandonova-ebooks') and exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid()))
) with check (
  bucket_id in ('zandonova-covers','zandonova-ebooks') and exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid()))
);
create policy "zando admins delete storage" on storage.objects for delete to authenticated using (
  bucket_id in ('zandonova-covers','zandonova-ebooks') and exists (select 1 from public.zando_admins a where a.user_id = (select auth.uid()))
);
