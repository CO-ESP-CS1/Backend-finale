# Guide Postman — Bibliothec API

## Prérequis

1. PostgreSQL avec la base `ecrivain` (utilisateur `postgres` / mot de passe `1234`).
2. Fichier `.env` à la racine (copiez `.env.example`).
3. Renseignez **`CLOUDINARY_CLOUD_NAME`** (dashboard Cloudinary → Account Details).
4. API démarrée : `npm run start:dev` → `http://localhost:3000/api`

## Importer la collection

1. Ouvrez **Postman**.
2. **Import** → fichier `postman/Bibliothec-API.postman_collection.json`.
3. La collection définit la variable `baseUrl` = `http://localhost:3000/api`.

## Parcours de test recommandé (de A à Z)

### Étape 1 — Admin & catalogue

1. **Connexion (admin)** — crée le token admin (compte seed : `admin@ecrivain.local` / `Admin123!`).
2. **Créer catégorie** — enregistre `categorieId`.
3. **Publier livre** — choisissez un PDF dans le champ `fichier` (obligatoire). Le livre est uploadé sur Cloudinary en mode `authenticated`.
4. **Catalogue livres** (sans auth) — récupère `livreId`.

### Étape 2 — Utilisateur

5. **Inscription** ou **Connexion (user)** — enregistre `accessToken` automatiquement via le script de test.
6. **Détail livre** — vérifiez qu’il n’y a **pas** de `fichierUrl`.
7. **Initier achat** — avec `PAWAPAY_MODE=simulate` dans `.env`.
8. **Confirmer paiement (mode simulate)** — passe l’achat en `SUCCES`.
9. **Ma bibliothèque** — le livre acheté apparaît.

### Étape 3 — Lecture (pas de téléchargement)

10. **Générer lien de lecture** — enregistre `lectureToken`.
11. **Accès lecture** — renvoie `lectureUrl` (URL Cloudinary signée, courte durée). À intégrer dans un lecteur PDF côté front.

### Étape 4 — Pawapay réel (plus tard)

- Passez `PAWAPAY_MODE=sandbox` et ajoutez `PAWAPAY_API_TOKEN`.
- Configurez le callback dans le dashboard Pawapay :  
  `POST https://votre-domaine/api/achats/webhooks/pawapay`
- En sandbox, les paiements se valident sans PIN téléphone ([doc Pawapay](https://docs.pawapay.io/v2/docs/deposits)).

## Variables de collection

| Variable        | Remplie par                          |
|-----------------|--------------------------------------|
| `accessToken`   | Connexion / Inscription              |
| `livreId`       | Catalogue livres                     |
| `achatId`       | Initier achat                        |
| `lectureToken`  | Générer lien de lecture              |
| `categorieId`   | Créer catégorie                      |

## Endpoints principaux

| Méthode | Route | Auth | Rôle |
|---------|-------|------|------|
| POST | `/auth/inscription` | Non | — |
| POST | `/auth/connexion` | Non | — |
| GET | `/livres` | Non | — |
| POST | `/achats` | JWT | USER |
| POST | `/achats/:id/confirmer-simulation` | JWT | USER (simulate) |
| GET | `/achats/bibliotheque` | JWT | USER |
| POST | `/lecture/achats/:achatId/lien` | JWT | USER |
| GET | `/lecture/acces/:token` | JWT | USER |
| POST | `/admin/livres` | JWT | ADMIN |
| GET | `/admin/stats` | JWT | ADMIN |
