-- Store additional public image URLs for each product.
alter table public.products
  add column if not exists gallery_images text[] not null default '{}';
