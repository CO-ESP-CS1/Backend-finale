export const OPERATEUR_VIREMENT_INTERNATIONAL = 'VIREMENT_INTERNATIONAL';

/** Statuts bloquant un nouvel achat pour le même livre */
export const ACHAT_STATUTS_BLOQUANTS = [
  'EN_ATTENTE',
  'PAIEMENT_SOUMIS',
  'SUCCES',
] as const;
