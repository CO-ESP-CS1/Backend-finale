import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class InscriptionDto {
  @IsString()
  @MaxLength(100)
  nom: string;

  @IsString()
  @MaxLength(100)
  prenom: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  motDePasse: string;
}
