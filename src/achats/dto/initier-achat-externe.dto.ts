import { IsUUID } from 'class-validator';

export class InitierAchatExterneDto {
  @IsUUID()
  livreId: string;
}
