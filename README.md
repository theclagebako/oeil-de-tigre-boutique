# Œil de Tigre 2.0 — Boutique dynamique

Boutique statique hébergeable sur Netlify, connectée à Supabase pour les produits, commandes, images et authentification administrateur.

## Contenu du dossier

- `index.html` : boutique et interfaces de commande / administration.
- `styles.css` : design responsive.
- `app.js` : logique de la boutique.
- `config.js` : URL Supabase, clé publique et numéro WhatsApp.
- `supabase/schema.sql` : tables, règles RLS, stockage et produits de départ.
- `netlify.toml` : configuration Netlify.

## A. Créer le projet Supabase

1. Créez un compte sur https://supabase.com/ puis un projet.
2. Dans **SQL Editor**, créez une nouvelle requête.
3. Copiez le contenu de `supabase/schema.sql`, collez-le et cliquez sur **Run**.
4. Dans **Project Settings > API** (ou **Connect** selon l'interface), copiez :
   - Project URL
   - la clé `anon` / `publishable` (clé publique, jamais `service_role` / `secret`).
5. Ouvrez `config.js` et remplacez les deux valeurs d'exemple par les vôtres.
6. Gardez `WHATSAPP_NUMBER` au format international sans `+` : `243818616951`.

## B. Créer le compte administrateur

1. Dans Supabase, ouvrez **Authentication > Users**.
2. Cliquez **Add user** / **Create new user**.
3. Créez votre adresse e-mail et un mot de passe robuste.
4. Copiez l'UUID de cet utilisateur dans la liste des utilisateurs.
5. Dans **SQL Editor**, exécutez cette requête en remplaçant l'UUID :

```sql
insert into public.admin_users (user_id)
values ('COLLER-ICI-UUID-DE-L-UTILISATEUR');
```

L'administration est volontairement fermée à l'inscription publique. Il n'y a pas de mot de passe par défaut dans le site.

## C. Tester en local

Ouvrez le dossier avec un petit serveur local (recommandé), par exemple l'extension Live Server de VS Code. Vous pouvez aussi déployer sur Netlify pour tester en HTTPS. La connexion Supabase doit être configurée dans `config.js`.

## D. Publier gratuitement sur Netlify

1. Créez un compte sur https://app.netlify.com/.
2. Ouvrez https://app.netlify.com/drop.
3. Déposez le dossier du site (celui qui contient directement `index.html`, `styles.css`, `app.js`, `config.js` et `netlify.toml`).
4. Netlify publie le site et fournit une adresse `*.netlify.app`.
5. Testez le catalogue, une commande, puis l'accès Admin.

Pour chaque mise à jour du code, redéposez le dossier sur Netlify ou reliez un dépôt Git.

## E. Utilisation de l'administration

- Le bouton ⚙ en bas à droite ouvre la connexion administrateur.
- Connectez-vous avec l'utilisateur Supabase ajouté dans `admin_users`.
- Ajoutez un produit, son prix, son stock et une image (max. 5 Mo).
- Modifiez, masquez, publiez ou supprimez les produits.
- L'onglet Commandes liste les commandes et permet de changer leur statut.
- Les visiteurs peuvent voir les produits actifs et créer une commande. Ils ne peuvent pas lire les commandes ni modifier les produits.

## Important : limites et sécurité

- La clé `anon` / `publishable` est une clé publique destinée au navigateur. La sécurité repose sur les politiques RLS de `schema.sql`.
- Ne mettez jamais une clé `service_role`, `secret` ou un mot de passe administrateur dans `config.js`.
- Les commandes sont enregistrées dans Supabase avant l'ouverture de WhatsApp. Le client doit encore envoyer le message dans WhatsApp pour finaliser le contact.
- Cette première version n'intègre pas de paiement en ligne et ne décrémente pas automatiquement le stock.
- Les règles SQL valident les champs de commande, mais le prix envoyé par le navigateur n'est pas une preuve de paiement ni une garantie de prix. Vérifiez les commandes avant confirmation.
- Le formulaire public est volontairement simple. Avant une campagne à fort trafic, ajoutez une protection anti-spam (par exemple CAPTCHA / Edge Function avec limitation de débit) et une validation serveur du prix à partir du produit.
- Les images du bucket sont publiques pour permettre leur affichage dans le catalogue. Ne téléversez pas de documents privés.
- Les offres gratuites de Netlify et Supabase ont des quotas et conditions susceptibles d'évoluer. Consultez leurs pages tarifaires.

## Dépannage

- Catalogue vide : vérifiez `config.js`, l'exécution de `schema.sql` et les erreurs de console.
- Connexion Admin refusée : vérifiez que l'utilisateur existe dans Authentication et que son UUID est dans `public.admin_users`.
- Upload refusé : vérifiez que l'utilisateur connecté est administrateur, que le bucket existe et que l'image fait moins de 5 Mo.
- Ne partagez jamais votre mot de passe, votre clé `service_role` ou un accès administrateur.
