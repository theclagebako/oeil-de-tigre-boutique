# ZANDONOVA DIGITAL STORE

Boutique d'ebooks et de guides numériques pour le marché de la RDC.

## Stack
- Frontend statique : HTML, CSS et JavaScript
- Backend : Supabase (Postgres, Auth et Storage)
- Hébergement : Netlify
- Paiement : prise de commande puis confirmation manuelle via WhatsApp / Mobile Money. Aucun paiement automatique n'est activé.

## Déploiement Netlify
1. Dans Netlify, choisissez **Add new site > Import an existing project**.
2. Connectez GitHub et sélectionnez `theclagebako/oeil-de-tigre-boutique`.
3. Choisissez la branche **zandonova-store**.
4. Build command : laisser vide. Publish directory : `.`.
5. Déployez. Le fichier `netlify.toml` contient aussi les paramètres de publication.

## Supabase
Le schéma Zandonova est isolé dans les tables `zando_*`; les tables historiques de la boutique Œil de Tigre ne sont pas modifiées.
Migration appliquée : `supabase/migrations/20261101000000_zandonova_digital_store.sql`.

Le projet utilise le bucket public `zandonova-covers` pour les couvertures et le bucket privé `zandonova-ebooks` pour les PDF.

## Accès administrateur
- Ouvrir `/admin.html`.
- Se connecter avec le compte Supabase Auth déjà autorisé dans `public.admin_users` avant la migration.
- La migration a copié ces UUID dans `public.zando_admins`.
- Les inscriptions publiques ne sont pas activées. N'ajoutez pas de mot de passe ou de clé secrète dans les fichiers du site.

Si le compte administrateur souhaité n'est pas autorisé, ajoutez son UUID dans `public.zando_admins` depuis l'éditeur SQL Supabase, après avoir créé le compte dans Authentication.

## Gestion des ebooks
Dans l'administration, ajoutez le titre, la catégorie, le résumé, la description, les prix USD et CDF, la couverture et le PDF. Le PDF est privé. Un produit doit posséder un PDF avant publication.

## Commandes
Le client ajoute des ebooks au panier puis transmet une commande via la fonction RPC `zando_create_order`. Les prix sont recalculés depuis la base de données. Le site ne collecte aucun code PIN et ne prétend pas traiter les paiements. L'administrateur vérifie le transfert Mobile Money avant de modifier le statut.

## Configuration
`config.js` contient uniquement l'URL et la clé publishable Supabase (destinée au navigateur) ainsi que le numéro WhatsApp public. N'y ajoutez jamais de clé `service_role`, de secret API ou de mot de passe.

## Avant lancement commercial
- Confirmer que le numéro WhatsApp dans `config.js` est bien le numéro professionnel à afficher.
- Vérifier le compte administrateur.
- Ajouter et tester au moins un véritable ebook et son PDF.
- Tester une commande de bout en bout.
- Publier les conditions de vente, la politique de confidentialité et la politique de remboursement.
- Mettre en place une procédure de confirmation de paiement et de livraison.
