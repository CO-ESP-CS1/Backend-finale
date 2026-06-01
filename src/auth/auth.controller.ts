import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { InscriptionDto } from './dto/inscription.dto';
import { ConnexionDto } from './dto/connexion.dto';
import { ChangerMotDePasseDto } from './dto/changer-mot-de-passe.dto';
import { SupprimerCompteDto } from './dto/supprimer-compte.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('inscription')
  inscription(@Body() dto: InscriptionDto) {
    return this.auth.inscription(dto);
  }

  @Post('connexion')
  connexion(@Body() dto: ConnexionDto) {
    return this.auth.connexion(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('moi')
  moi(@CurrentUser() user: { sub: string }) {
    return this.auth.profil(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mot-de-passe')
  changerMotDePasse(
    @CurrentUser() user: { sub: string },
    @Body() dto: ChangerMotDePasseDto,
  ) {
    return this.auth.changerMotDePasse(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('compte')
  supprimerCompte(
    @CurrentUser() user: { sub: string },
    @Body() dto: SupprimerCompteDto,
  ) {
    return this.auth.supprimerCompte(user.sub, dto);
  }
}
