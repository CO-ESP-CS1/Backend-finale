/** Devises proposées pour le virement international (liste statique, sans API externe). */
export const DEVISES_INTERNATIONALES = [
  { code: 'XAF', label: 'Franc CFA (CEMAC)', symbole: 'FCFA' },
  { code: 'XOF', label: 'Franc CFA (UEMOA)', symbole: 'FCFA' },
  { code: 'EUR', label: 'Euro', symbole: '€' },
  { code: 'USD', label: 'Dollar américain', symbole: '$' },
  { code: 'GBP', label: 'Livre sterling', symbole: '£' },
  { code: 'CHF', label: 'Franc suisse', symbole: 'CHF' },
  { code: 'CAD', label: 'Dollar canadien', symbole: 'CA$' },
  { code: 'AUD', label: 'Dollar australien', symbole: 'A$' },
  { code: 'ZAR', label: 'Rand sud-africain', symbole: 'R' },
  { code: 'MAD', label: 'Dirham marocain', symbole: 'MAD' },
  { code: 'NGN', label: 'Naira nigérian', symbole: '₦' },
  { code: 'GHS', label: 'Cedi ghanéen', symbole: '₵' },
] as const;

export const DEVISES_CODES = DEVISES_INTERNATIONALES.map((d) => d.code);
