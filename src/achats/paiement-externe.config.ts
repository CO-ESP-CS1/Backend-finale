import { ConfigService } from '@nestjs/config';

/** Valeurs de démonstration si le .env n’est pas encore configuré. */
const COORDONNEES_DEMO = {
  beneficiaire: 'Éditions Bibliothèc SARL',
  nomBanque: 'Banque Atlantique Congo',
  iban: 'CG39 3012 0000 0123 4567 8901 23',
  bicSwift: 'ATCGCGLX',
  adresseBanque: '12 Avenue de la Paix, Brazzaville, République du Congo',
  instructions:
    'Indiquez la référence de commande (BIBLIOTHEC-…) dans le libellé du virement. Délai de traitement : 24 h ouvrées.',
  referencePrefix: 'BIBLIOTHEC',
  delaiValidationHeures: 24,
};

export function coordonneesBancairesFromEnv(config: ConfigService) {
  const fromEnv = {
    beneficiaire: config.get<string>('BANK_BENEFICIAIRE', '').trim(),
    nomBanque: config.get<string>('BANK_NOM', '').trim(),
    iban: config.get<string>('BANK_IBAN', '').trim(),
    bicSwift: config.get<string>('BANK_BIC_SWIFT', '').trim(),
    adresseBanque: config.get<string>('BANK_ADRESSE', '').trim(),
    instructions: config.get<string>('BANK_INSTRUCTIONS', '').trim(),
    referencePrefix:
      config.get<string>('BANK_REFERENCE_PREFIX', 'BIBLIOTHEC').trim() ||
      'BIBLIOTHEC',
    delaiValidationHeures: 24,
  };

  const useDemo = !fromEnv.beneficiaire || !fromEnv.iban;

  return {
    beneficiaire: fromEnv.beneficiaire || COORDONNEES_DEMO.beneficiaire,
    nomBanque: fromEnv.nomBanque || COORDONNEES_DEMO.nomBanque,
    iban: fromEnv.iban || COORDONNEES_DEMO.iban,
    bicSwift: fromEnv.bicSwift || COORDONNEES_DEMO.bicSwift,
    adresseBanque: fromEnv.adresseBanque || COORDONNEES_DEMO.adresseBanque,
    instructions: fromEnv.instructions || COORDONNEES_DEMO.instructions,
    referencePrefix: fromEnv.referencePrefix || COORDONNEES_DEMO.referencePrefix,
    delaiValidationHeures: COORDONNEES_DEMO.delaiValidationHeures,
    modeDemo: useDemo,
  };
}
