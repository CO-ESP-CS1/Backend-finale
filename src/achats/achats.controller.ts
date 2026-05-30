import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AchatsService } from './achats.service';
import { InitierAchatDto } from './dto/initier-achat.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('achats')
export class AchatsController {
  constructor(private achats: AchatsService) {}

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
