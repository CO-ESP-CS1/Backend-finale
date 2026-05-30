/** Congo-Brazzaville (COG) — devise XAF, Pawapay v2. */
export const PAWAPAY_DEVISE_DEFAUT = 'XAF';

export const PAWAPAY_OPERATEURS = [
  {
    code: 'MTN_MOMO_COG',
    nom: 'MTN',
    indicatif: '242',
    description: 'MTN Mobile Money Congo-Brazzaville',
  },
  {
    code: 'AIRTEL_COG',
    nom: 'Airtel',
    indicatif: '242',
    description: 'Airtel Money Congo-Brazzaville',
  },
] as const;

export type OperateurPawapayCode =
  (typeof PAWAPAY_OPERATEURS)[number]['code'];

export const OPERATEURS_PAWAPAY_CODES: OperateurPawapayCode[] =
  PAWAPAY_OPERATEURS.map((o) => o.code);

export const PAWAPAY_PROVIDER_DEFAUT: OperateurPawapayCode = 'MTN_MOMO_COG';

/** Numéros de test sandbox Pawapay (dépôt réussi). */
export const PAWAPAY_MSISDN_TEST = {
  MTN_MOMO_COG: '242063456789',
  AIRTEL_COG: '242053456789',
} as const;
