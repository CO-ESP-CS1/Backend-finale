import {
  Controller,
  Get,
  Param,
  Post,
  ParseUUIDPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { LectureService } from './lecture.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('lecture')
export class LectureController {
  constructor(private lecture: LectureService) {}

  @UseGuards(JwtAuthGuard)
  @Post('achats/:achatId/lien')
  genererLien(
    @CurrentUser() user: { sub: string },
    @Param('achatId', ParseUUIDPipe) achatId: string,
  ) {
    return this.lecture.genererLien(user.sub, achatId);
  }

  /** Accès lecture : JWT recommandé ; token de lien dans l’URL. */
  @UseGuards(JwtAuthGuard)
  @Get('acces/:token')
  acces(
    @CurrentUser() user: { sub: string },
    @Param('token') token: string,
  ) {
    return this.lecture.accesLecture(token, user.sub);
  }

  /** Flux PDF binaire — évite l’accès direct Cloudinary depuis le navigateur. */
  @UseGuards(JwtAuthGuard)
  @Get('fichier/:token')
  async fichier(
    @CurrentUser() user: { sub: string },
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    const { buffer, titre, format } = await this.lecture.telechargerFichier(
      token,
      user.sub,
    );
    res.set({
      'Content-Type':
        format === 'PDF' ? 'application/pdf' : 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(titre)}.pdf"`,
      'Cache-Control': 'private, no-store',
    });
    res.send(buffer);
  }
}
