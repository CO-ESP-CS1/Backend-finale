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
import { CreerLivreDto } from './dto/creer-livre.dto';
import { CreerCategorieDto } from './dto/creer-categorie.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private admin: AdminService) {}

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

  @Get('livres')
  livres() {
    return this.admin.listerLivresAdmin();
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
  modifierLivre(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreerLivreDto>,
  ) {
    return this.admin.modifierLivre(id, dto);
  }

  @Delete('livres/:id')
  supprimerLivre(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.supprimerLivre(id);
  }

  @Post('categories')
  creerCategorie(@Body() dto: CreerCategorieDto) {
    return this.admin.creerCategorie(dto);
  }
}
