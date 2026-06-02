import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { DEVISES_CODES } from '../../common/constants/devises.constants';
import { INDICATIFS_CODES } from '../../common/constants/indicatifs-pays.constants';

export class SoumettrePreuveDto {
  @IsString()
  @MaxLength(200)
  refTransaction: string;

  @IsString()
  @MaxLength(200)
  nomBanque: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  montantDeclare: number;

  @IsString()
  @IsIn(DEVISES_CODES, {
    message: `deviseDeclare doit être l'une des devises supportées`,
  })
  deviseDeclare: string;

  @IsDateString()
  datePaiement: string;

  /** Indicatif pays (ex. 242, 33) — facultatif, requis si telephoneNumero est renseigné. */
  @IsOptional()
  @IsString()
  @IsIn(INDICATIFS_CODES, {
    message: 'telephoneIndicatif invalide',
  })
  telephoneIndicatif?: string;

  /** Numéro local sans indicatif — facultatif. */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  @Matches(/^[0-9]{6,15}$/, {
    message: 'telephoneNumero doit contenir 6 à 15 chiffres',
  })
  telephoneNumero?: string;
}
