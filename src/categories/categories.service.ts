import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { actif } from '../common/soft-delete';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  lister() {
    return this.prisma.categorie.findMany({
      where: actif,
      select: { id: true, nom: true, description: true },
      orderBy: { nom: 'asc' },
    });
  }
}
