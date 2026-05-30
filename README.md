# Bibliothec API v1

Backend NestJS + Prisma + PostgreSQL pour la vente et la **lecture en ligne** de livres numériques (un écrivain / une bibliothèque).

## Démarrage rapide

```bash
npm install
cp .env.example .env
# Éditez .env : DATABASE_URL, CLOUDINARY_CLOUD_NAME, etc.

npx prisma migrate dev
npm run start:dev
```

API : `http://localhost:3000/api`

## Stack

- **NestJS 11** — API REST
- **Prisma 7** — ORM PostgreSQL
- **JWT** — access token 6 mois (pas de refresh)
- **Cloudinary** — stockage PDF/couvertures (fichiers `authenticated`)
- **PawaPay** — paiements Mobile Money ([documentation](https://docs.pawapay.io/v2/docs/deposits))

## Règles métier

- Catalogue public **sans** `fichierUrl`
- Achat unique par utilisateur/livre
- Lecture via **lien temporaire** (`lien_lecture`), pas de téléchargement direct
- **Soft delete** partout (`deletedAt`)
- Mot de passe modifiable **uniquement connecté**
- Admin = l’écrivain (upload PDF, stats)

## Modes Pawapay (`.env`)

| `PAWAPAY_MODE` | Comportement |
|----------------|--------------|
| `simulate`     | Pas d’appel HTTP ; confirmer avec `POST /achats/:id/confirmer-simulation` |
| `sandbox`      | Appels réels vers `api.sandbox.pawapay.io` |
| `live`         | Production |

## Tests Postman

Voir [docs/GUIDE-POSTMAN.md](docs/GUIDE-POSTMAN.md) et importer `postman/Bibliothec-API.postman_collection.json`.

## Compte admin par défaut

- Email : `admin@ecrivain.local`
- Mot de passe : `Admin123!` (modifiable dans `.env`)
