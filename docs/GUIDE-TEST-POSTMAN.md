# Guide de test Postman — de A à Z

Fichier à importer : **`postman/Bibliothec-API.postman_collection.json`**

---

## 1. Avant de commencer

| Élément | Vérification |
|---------|----------------|
| PostgreSQL | Base `ecrivain` accessible |
| API | `npm run start:dev` → message `Bibliothec API : http://localhost:3000/api` |
| Cloudinary | `CLOUDINARY_CLOUD_NAME` rempli dans `.env` |
| Pawapay | `PAWAPAY_MODE=sandbox` + `PAWAPAY_API_TOKEN` rempli |
| ngrok (callbacks) | `ngrok http 3000` si vous testez les vrais callbacks Pawapay |

---

## 2. Installer la collection dans Postman

1. Ouvrez **Postman** (application ou web).
2. Menu **Import** (en haut à gauche).
3. Glissez-déposez le fichier `Bibliothec-API.postman_collection.json` ou **Upload Files**.
4. Cliquez **Import**.
5. Dans la barre latérale, ouvrez la collection **Bibliothec API v1 — Parcours complet**.

### Variables de la collection

Cliquez sur la collection → onglet **Variables** :

| Variable | Valeur par défaut | Rôle |
|----------|-------------------|------|
| `baseUrl` | `http://localhost:3000/api` | Racine de l’API |
| `adminToken` | (vide) | Rempli après connexion admin |
| `userToken` | (vide) | Rempli après inscription/connexion client |
| `categorieId` | (vide) | Rempli après création catégorie |
| `livreId` | (vide) | Rempli après publication du livre |
| `achatId` | (vide) | Rempli après initier achat |
| `lectureToken` | (vide) | Rempli après génération du lien |

Les scripts **Tests** remplissent ces variables automatiquement quand la requête réussit.

---

## 3. Parcours recommandé (admin → client)

### Dossier **A — Admin : créer le livre**

| Étape | Requête | Ce que vous faites | Résultat attendu |
|-------|---------|-------------------|------------------|
| **A1** | Connexion admin | Envoyer | `accessToken` + `adminToken` enregistrés |
| **A2** | Créer catégorie | Envoyer | `categorieId` enregistré |
| **A3** | Publier livre | **Important** : onglet **Body** → **form-data** → champ **fichier** → **Select Files** → choisir un **PDF** | `livreId` enregistré, statut 200/201 |
| **A4** | Détail livre public | Envoyer | Titre, prix, **sans** `fichierUrl` |
| **A5** | Stats | Optionnel | Nombre de livres, utilisateurs… |

**A3 en détail :**

1. Ouvrez **A3 — Publier livre**.
2. Onglet **Body** → type **form-data** (déjà configuré).
3. Ligne **fichier** : passez le type en **File** si besoin, cliquez **Select Files**, choisissez un PDF.
4. Ligne **couverture** : optionnel (jpg/png).
5. **Send**.

---

### Dossier **B — Client : inscription & catalogue**

| Étape | Requête | Note |
|-------|---------|------|
| **B1** | Inscription | Première fois avec `marie.test@example.com` |
| **B2** | Connexion client | Si B1 échoue (email déjà pris), utilisez B2 |
| **B3** | Mon profil | Vérifie nom, email |
| **B4–B6** | Catalogue | Public, **sans** token pour B4–B6 |

---

### Dossier **C — Client : achat Pawapay sandbox**

| Étape | Requête | Résultat attendu |
|-------|---------|------------------|
| **C1** | Initier achat | `achatId`, `statut: EN_ATTENTE`, réponse Pawapay `ACCEPTED` |
| **C2** | Statut achat | Relancer 2–3 fois → `statut: SUCCES` (callback sandbox ou polling) |
| **C3** | Ma bibliothèque | Tableau avec le livre acheté |
| **C4** | Callback manuel | **Seulement** si C2 reste bloqué en `EN_ATTENTE` |
| **C5** | Simulation | **Ignorer** en mode sandbox |

**Numéro de téléphone** : format `242063456789` (Congo-Brazzaville, indicatif **242**, sans `+`).

**Opérateurs** : `MTN_MOMO_COG` (défaut) ou `AIRTEL_COG`. Liste : `GET /api/pawapay/operateurs`.

**Devise** : **XAF** (franc CFA CEMAC).

---

### Dossier **D — Client : lecture en ligne**

| Étape | Requête | Résultat |
|-------|---------|----------|
| **D1** | Générer lien | `token`, `expiresAt` |
| **D2** | Accès lecture | JSON avec `lectureUrl` → ouvrir dans le navigateur |

---

### Dossier **E — Admin : suivi**

Après un achat réussi : **E1** liste les achats, **E2** les clients, **E3** les livres.

---

## 4. Comprendre les réponses

### Connexion / inscription

```json
{
  "accessToken": "eyJhbG...",
  "utilisateur": { "id": "...", "email": "...", "role": "USER" }
}
```

Copiez le token dans l’onglet **Authorization** seulement si les scripts ne tournent pas ; sinon `{{userToken}}` / `{{adminToken}}` suffisent.

### Catalogue livre (public)

- Présent : `titre`, `prix`, `resume`, `couvertureUrl`, `format`
- Absent : `fichierUrl`, `fichierPublicId`

### Achat réussi

```json
{ "id": "...", "statut": "SUCCES", "livre": { "titre": "..." } }
```

### Lecture

```json
{
  "lectureUrl": "https://res.cloudinary.com/...",
  "titre": "...",
  "expiresAt": "..."
}
```

---

## 5. Erreurs fréquentes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `ECONNREFUSED` | API arrêtée | `npm run start:dev` |
| `401 Unauthorized` | Token expiré ou mauvais rôle | Refaire A1 ou B2 |
| `403` sur `/admin/*` | Token client au lieu d’admin | Refaire **A1** |
| `Le fichier PDF est obligatoire` | Pas de fichier dans A3 | Sélectionner un PDF en **form-data** |
| `PAWAPAY_API_TOKEN manquant` | `.env` incomplet | Ajouter le token sandbox |
| `Vous possédez déjà ce livre` | Même user + même livre | Autre email (B1) ou autre livre |
| Catégorie duplicate | Nom déjà utilisé | Changer `nom` dans A2 (ex. `Essai`) |

---

## 6. Tester avec le Runner (enchaînement auto)

1. Clic droit sur la collection → **Run collection**.
2. Décochez **C4**, **C5**, **Z** si besoin.
3. Pour **A3**, le Runner ne choisit pas de fichier : lancez **A3 manuellement** avec un PDF, puis continuez le Runner à partir de **A4**.
4. Ordre conseillé : dossiers **A → B → C → D**.

---

## 7. Récap des URLs

Toutes les requêtes utilisent : `http://localhost:3000/api/...`

Exemples :

- `POST /auth/connexion`
- `POST /admin/livres` (multipart)
- `GET /livres`
- `POST /achats`
- `GET /achats/bibliotheque`
- `POST /lecture/achats/:achatId/lien`
