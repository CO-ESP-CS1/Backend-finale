import { Injectable, NotFoundException } from '@nestjs/common';
import { LivreStatut, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { actif } from '../common/soft-delete';

const livrePublicSelect = {
  id: true,
  titre: true,
  auteur: true,
  resume: true,
  couvertureUrl: true,
  format: true,
  prix: true,
  devise: true,
  nombrePages: true,
  anneePublication: true,
  statut: true,
  createdAt: true,
  categorie: {
    select: { id: true, nom: true },
  },
} satisfies Prisma.LivreSelect;

@Injectable()
export class LivresService {
  constructor(private prisma: PrismaService) {}

  async catalogue(params?: {
    categorieId?: string;
    recherche?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params?.page ?? 1;
    const limit = Math.min(params?.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.LivreWhereInput = {
      ...actif,
      statut: LivreStatut.PUBLIE,
      ...(params?.categorieId && { categorieId: params.categorieId }),
      ...(params?.recherche && {
        titre: { contains: params.recherche, mode: 'insensitive' },
      }),
    };

    const [livres, total] = await Promise.all([
      this.prisma.livre.findMany({
        where,
        select: livrePublicSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.livre.count({ where }),
    ]);

    return {
      data: livres.map((l) => this.formatLivre(l)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async detail(id: string) {
    const livre = await this.prisma.livre.findFirst({
      where: { id, ...actif, statut: LivreStatut.PUBLIE },
      select: livrePublicSelect,
    });
    if (!livre) throw new NotFoundException('Livre introuvable');
    return this.formatLivre(livre);
  }

  private formatLivre(livre: {
    prix: Prisma.Decimal;
    [key: string]: unknown;
  }) {
    return {
      ...livre,
      prix: Number(livre.prix),
    };
  }
}
