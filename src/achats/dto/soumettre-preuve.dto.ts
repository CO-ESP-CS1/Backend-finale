import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { DEVISES_CODES } from '../../common/constants/devises.constants';

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
}
