import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { LivreFormat, LivreStatut } from '@prisma/client';
import { Type } from 'class-transformer';

export class ModifierLivreDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  titre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  auteur?: string;

  @IsOptional()
  @IsString()
  resume?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  prix?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  devise?: string;

  @IsOptional()
  @IsEnum(LivreFormat)
  format?: LivreFormat;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  nombrePages?: number;

  @IsOptional()
  @IsInt()
  @Min(1901)
  @Type(() => Number)
  anneePublication?: number;

  @IsOptional()
  @IsEnum(LivreStatut)
  statut?: LivreStatut;
}
