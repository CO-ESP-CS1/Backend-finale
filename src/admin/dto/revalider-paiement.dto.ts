import { IsString, MinLength } from 'class-validator';

export class RevaliderPaiementDto {
  @IsString()
  @MinLength(1, { message: 'Mot de passe administrateur requis' })
  motDePasseAdmin: string;
}
