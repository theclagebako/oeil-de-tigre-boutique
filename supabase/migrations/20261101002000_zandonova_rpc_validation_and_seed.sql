-- Zandonova order validation refinements and initial unpublished product drafts.
create index if not exists zando_order_items_product_idx on public.zando_order_items(product_id);

create or replace function public.zando_create_order(
  p_customer_name text,p_customer_phone text,p_customer_city text,p_payment_method text,
  p_currency text,p_customer_note text,p_items jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_order_id uuid;v_item jsonb;v_product public.zando_products%rowtype;v_qty integer;v_usd numeric(12,2):=0;v_cdf numeric(14,2):=0;
begin
  if length(trim(coalesce(p_customer_name,''))) not between 2 and 120 or length(trim(coalesce(p_customer_phone,''))) not between 7 and 35 or length(trim(coalesce(p_customer_city,''))) not between 2 and 100 then raise exception 'Veuillez vérifier votre nom, téléphone et ville.';end if;
  if p_payment_method not in('M-Pesa','Orange Money','Airtel Money','Autre') or p_currency not in('USD','CDF') then raise exception 'Mode de paiement ou devise invalide.';end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Le panier est vide ou invalide.';end if;
  if jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Le panier est vide ou contient trop de produits.';end if;
  insert into public.zando_orders(customer_name,customer_phone,customer_city,payment_method,currency,customer_note) values(trim(p_customer_name),trim(p_customer_phone),trim(p_customer_city),p_payment_method,p_currency,left(coalesce(p_customer_note,''),500)) returning id into v_order_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty:=(v_item->>'quantity')::integer;if v_qty not between 1 and 10 then raise exception 'Quantité invalide.';end if;
    select * into v_product from public.zando_products where id=(v_item->>'product_id')::uuid and is_published=true;
    if not found then raise exception 'Un produit du panier n’est plus disponible.';end if;
    if v_product.file_path is null then raise exception 'Un produit du panier n’est pas encore prêt à être livré.';end if;
    v_usd:=v_usd+v_product.price_usd*v_qty;v_cdf:=v_cdf+v_product.price_cdf*v_qty;
    insert into public.zando_order_items(order_id,product_id,product_title,quantity,unit_price_usd,unit_price_cdf) values(v_order_id,v_product.id,v_product.title,v_qty,v_product.price_usd,v_product.price_cdf);
  end loop;
  update public.zando_orders set total_usd=v_usd,total_cdf=v_cdf where id=v_order_id;return v_order_id;
end;$$;
revoke execute on function public.zando_create_order(text,text,text,text,text,text,jsonb) from authenticated;
revoke execute on function public.zando_create_order(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.zando_create_order(text,text,text,text,text,text,jsonb) to anon;

insert into public.zando_products(category_id,title,slug,short_description,description,price_usd,price_cdf,is_published,is_featured)
select c.id,v.title,v.slug,v.short_description,v.description,v.price_usd,0,false,v.featured
from (values
('15 petits business à lancer en RDC','15-petits-business-rdc','Des idées de petites activités, avec des pistes pour étudier le budget, les clients et le démarrage.','Guide de travail à compléter avec des exemples et des budgets réalistes selon la ville et le contexte local.',3.00,true,'business'),
('Vendre sur WhatsApp et Facebook','vendre-whatsapp-facebook','Apprenez à présenter une offre, créer du contenu et organiser vos échanges avec les clients.','Guide pratique sur la présentation des produits, le contenu utile, le service client et le suivi des commandes.',3.00,true,'marketing'),
('Créer des visuels professionnels avec Canva','creer-visuels-canva','Un parcours débutant pour concevoir des affiches, flyers et publications claires.','Guide d’initiation à Canva avec exercices, formats utiles et conseils de lisibilité.',4.00,false,'technologie'),
('Utiliser ChatGPT pour apprendre et travailler','utiliser-chatgpt-apprendre-travailler','Découvrez comment formuler des demandes utiles et vérifier les réponses de l’IA.','Guide de prise en main de ChatGPT pour apprendre, organiser ses idées et améliorer des tâches quotidiennes.',3.00,false,'technologie'),
('Bien gérer son argent au quotidien','gerer-son-argent-quotidien','Des méthodes simples pour organiser un budget, suivre ses dépenses et planifier une épargne.','Guide pédagogique de gestion du budget personnel, sans promesse de gain financier.',3.00,false,'developpement-personnel')
) as v(title,slug,short_description,description,price_usd,featured,category_slug)
join public.zando_categories c on c.slug=v.category_slug
on conflict(slug) do nothing;
