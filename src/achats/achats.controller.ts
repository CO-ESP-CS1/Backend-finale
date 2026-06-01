import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AchatsService } from './achats.service';
import { InitierAchatDto } from './dto/initier-achat.dto';
import { InitierAchatExterneDto } from './dto/initier-achat-externe.dto';
import { SoumettrePreuveDto } from './dto/soumettre-preuve.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('achats')
export class AchatsController {
  constructor(private achats: AchatsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('meta/devises')
  devises() {
    return this.achats.devisesSupportees();
  }

  @UseGuards(JwtAuthGuard)
  @Get('meta/coordonnees-bancaires')
  coordonneesBancaires() {
    return this.achats.coordonneesBancaires();
  }

  @UseGuards(JwtAuthGuard)
  @Get('externes/en-attente')
  externesEnAttente(@CurrentUser() user: { sub: string }) {
    return this.achats.listerExternesEnAttente(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('externe')
  initierExterne(
    @CurrentUser() user: { sub: string },
    @Body() dto: InitierAchatExterneDto,
  ) {
    return this.achats.initierExterne(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  initier(@CurrentUser() user: { sub: string }, @Body() dto: InitierAchatDto) {
    return this.achats.initier(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bibliotheque')
  bibliotheque(@CurrentUser() user: { sub: string }) {
    return this.achats.maBibliotheque(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/soumettre-preuve')
  @UseInterceptors(FilesInterceptor('preuves', 2))
  soumettrePreuve(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SoumettrePreuveDto,
    @UploadedFiles() fichiers: Express.Multer.File[],
  ) {
    return this.achats.soumettrePreuve(id, user.sub, dto, fichiers ?? []);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  statut(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.achats.statut(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/confirmer-simulation')
  confirmerSimulation(
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.achats.confirmerSimulation(id, user.sub);
  }
}
