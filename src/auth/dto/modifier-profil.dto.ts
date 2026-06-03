import { IsString, MaxLength, MinLength } from 'class-validator';

export class ModifierProfilDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nom: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  prenom: string;
}
