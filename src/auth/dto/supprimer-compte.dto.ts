import { IsString, MaxLength, MinLength } from 'class-validator';

export class SupprimerCompteDto {
  @IsString()
  @MinLength(10, {
    message: 'Veuillez préciser le motif de suppression (au moins 10 caractères).',
  })
  @MaxLength(500)
  motif: string;
}
