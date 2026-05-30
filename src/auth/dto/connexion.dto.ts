import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class ConnexionDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  motDePasse: string;
}
