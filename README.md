# ZANDONOVA DIGITAL STORE

Boutique d'ebooks et de guides numériques pour le marché de la RDC.

## Stack
- Frontend statique : HTML, CSS et JavaScript
- Backend : Supabase (Postgres, Auth et Storage)
- Hébergement : Netlify
- Paiement : commande enregistrée puis confirmation manuelle via WhatsApp / Mobile Money. Aucun paiement automatique n'est activé.

## Déploiement Netlify
1. Dans Netlify, choisissez **Add new site > Import an existing project**.
2. Connectez GitHub et sélectionnez `theclagebako/oeil-de-tigre-boutique`.
3. Choisissez la branche **zandonova-store**.
4. Build command : laisser vide. Publish directory : `.`.
5. Déployez.

## Supabase
Les tables Zandonova utilisent le préfixe `zando_*`; les tables historiques Œil de Tigre restent intactes.
Migrations :
- `supabase/migrations/20261101000000_zandonova_digital_store.sql`
- `supabase/migrations/20261101001000_zandonova_rls_policy_hardening.sql`

Buckets :
- `zandonova-covers` : couvertures publiques.
- `zandonova-ebooks` : PDF privés, liens signés de livraison valables une heure.

## Accès administrateur
1. Ouvrir `/admin.html`.
2. Se connecter avec le compte Supabase Auth déjà autorisé dans `public.admin_users` avant la migration.
3. Son UUID a été copié dans `public.zando_admins`.
4. Les inscriptions publiques ne sont pas activées.

Pour autoriser un autre compte, créez-le dans Supabase Authentication puis ajoutez son UUID à `public.zando_admins`.

## Gestion des ebooks
Dans l'administration, ajoutez titre, catégorie, résumé, description, prix USD/CDF, couverture et PDF. Un ebook doit posséder un PDF avant publication. Limites : 5 Mo pour une couverture et 20 Mo pour un PDF.

## Commandes
Le client commande via la fonction RPC `zando_create_order`. Les prix sont recalculés depuis la base de données. Le site ne prélève pas les paiements : l'administrateur vérifie le transfert Mobile Money avant de changer le statut. Les PDF sont servis depuis un bucket privé.

## Configuration
`config.js` contient uniquement l'URL et la clé publishable Supabase (publique) ainsi que le numéro WhatsApp. N'y placez jamais de clé `service_role`, de secret API ou de mot de passe.

## Avant lancement commercial
- Confirmer le numéro WhatsApp professionnel dans `config.js`.
- Vérifier l'accès administrateur.
- Ajouter et tester un véritable ebook et son PDF.
- Tester une commande de bout en bout.
- Publier les conditions de vente, la politique de confidentialité et de remboursement.
