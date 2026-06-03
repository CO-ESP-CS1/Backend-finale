import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { AchatsService } from '../achats/achats.service';
import { CreerLivreDto } from './dto/creer-livre.dto';
import { ModifierLivreDto } from './dto/modifier-livre.dto';
import { CreerCategorieDto } from './dto/creer-categorie.dto';
import { ModifierCategorieDto } from './dto/modifier-categorie.dto';
import { RefuserPaiementDto } from './dto/refuser-paiement.dto';
import { RevaliderPaiementDto } from './dto/revalider-paiement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private admin: AdminService,
    private achatsService: AchatsService,
  ) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('utilisateurs')
  utilisateurs() {
    return this.admin.listerUtilisateurs();
  }

  @Get('achats')
  achats() {
    return this.admin.listerAchats();
  }

  @Get('achats/:id')
  detailAchat(@Param('id', ParseUUIDPipe) id: string) {
    return this.achatsService.detailAdmin(id);
  }

  @Post('achats/:id/valider-paiement')
  validerPaiement(@Param('id', ParseUUIDPipe) id: string) {
    return this.achatsService.validerPaiementExterne(id);
  }

  @Post('achats/:id/refuser-paiement')
  refuserPaiement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefuserPaiementDto,
  ) {
    return this.achatsService.refuserPaiementExterne(id, dto.motif);
  }

  @Post('achats/:id/revalider-paiement')
  revaliderPaiement(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: RevaliderPaiementDto,
  ) {
    return this.achatsService.revaliderPaiementExterne(
      id,
      user.sub,
      dto.motDePasseAdmin,
    );
  }

  @Get('livres')
  livres() {
    return this.admin.listerLivresAdmin();
  }

  @Get('livres/:id')
  detailLivre(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.detailLivreAdmin(id);
  }

  @Post('livres')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'fichier', maxCount: 1 },
      { name: 'couverture', maxCount: 1 },
    ]),
  )
  creerLivre(
    @Body() dto: CreerLivreDto,
    @UploadedFiles()
    files: {
      fichier?: Express.Multer.File[];
      couverture?: Express.Multer.File[];
    },
  ) {
    const fichier = files.fichier?.[0];
    if (!fichier) {
      throw new BadRequestException('Le fichier PDF est obligatoire');
    }
    return this.admin.creerLivre(dto, fichier, files.couverture?.[0]);
  }

  @Patch('livres/:id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'fichier', maxCount: 1 },
      { name: 'couverture', maxCount: 1 },
    ]),
  )
  modifierLivre(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModifierLivreDto,
    @UploadedFiles()
    files: {
      fichier?: Express.Multer.File[];
      couverture?: Express.Multer.File[];
    },
  ) {
    return this.admin.modifierLivre(
      id,
      dto,
      files.fichier?.[0],
      files.couverture?.[0],
    );
  }

  @Delete('livres/:id')
  supprimerLivre(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.supprimerLivre(id);
  }

  @Post('livres/:id/desarchiver')
  desarchiverLivre(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.desarchiverLivre(id);
  }

  @Post('categories')
  creerCategorie(@Body() dto: CreerCategorieDto) {
    return this.admin.creerCategorie(dto);
  }

  @Patch('categories/:id')
  modifierCategorie(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModifierCategorieDto,
  ) {
    return this.admin.modifierCategorie(id, dto);
  }
}
