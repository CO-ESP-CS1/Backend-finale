import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RefuserPaiementDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motif?: string;
}
