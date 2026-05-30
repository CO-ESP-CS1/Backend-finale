import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { LivresService } from './livres.service';

@Controller('livres')
export class LivresController {
  constructor(private livres: LivresService) {}

  @Get()
  catalogue(
    @Query('categorieId') categorieId?: string,
    @Query('recherche') recherche?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.livres.catalogue({
      categorieId,
      recherche,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.livres.detail(id);
  }
}
