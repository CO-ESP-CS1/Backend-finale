# Pawapay Sandbox + ngrok

## URLs à coller dans le dashboard Pawapay

Remplacez le domaine si votre tunnel ngrok change.

| Type | Callback URL |
|------|----------------|
| **Deposits** | `https://specks-contents-amazingly.ngrok-free.dev/api/webhooks/pawapay/deposits` |
| **Payouts** | `https://specks-contents-amazingly.ngrok-free.dev/api/webhooks/pawapay/payouts` |
| **Refunds** | `https://specks-contents-amazingly.ngrok-free.dev/api/webhooks/pawapay/refunds` |

Cliquez **Save**, puis générez le **API token** sandbox.

## Configuration `.env`

```env
PAWAPAY_MODE="sandbox"
PAWAPAY_API_URL="https://api.sandbox.pawapay.io"
PAWAPAY_API_TOKEN="votre-token-ici"
```

## Ordre de mise en place

1. `npm run start:dev` (API sur port 3000)
2. `ngrok http 3000` (tunnel actif)
3. Coller les 3 URLs ci-dessus dans Pawapay → **Save**
4. Générer le token API → le coller dans `PAWAPAY_API_TOKEN`
5. Redémarrer l’API si le token a été ajouté après le démarrage

## Test d’un achat

`POST /api/achats` avec JWT user, `livreId`, `numeroTelephone` (ex. `242063456789`), `operateur` : `MTN_MOMO_COG` ou `AIRTEL_COG` (Congo-Brazzaville, devise **XAF**).

`GET /api/pawapay/operateurs` — liste des opérateurs acceptés.

En sandbox, le paiement est validé automatiquement (pas de PIN téléphone). Le statut final arrive sur **Deposits callback**.
