import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { OPERATEURS_PAWAPAY_CODES } from '../../pawapay/pawapay.constants';

export class InitierAchatDto {
  @IsUUID()
  livreId: string;

  /** MSISDN : indicatif 242, sans + ni zéro initial (ex. 242061234567). */
  @IsString()
  @Matches(/^242[0-9]{8,12}$/, {
    message:
      'Numéro invalide pour le Congo (+242) : utilisez le format 242XXXXXXXX',
  })
  numeroTelephone: string;

  /** MTN_MOMO_COG (défaut) ou AIRTEL_COG */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @IsIn(OPERATEURS_PAWAPAY_CODES, {
    message: `operateur doit être : ${OPERATEURS_PAWAPAY_CODES.join(' ou ')}`,
  })
  operateur?: string;
}
