import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangerMotDePasseDto {
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  ancienMotDePasse: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  nouveauMotDePasse: string;
}
