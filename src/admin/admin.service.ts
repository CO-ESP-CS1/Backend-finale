import { Injectable, NotFoundException } from '@nestjs/common';
import { LivreStatut, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { actif } from '../common/soft-delete';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreerLivreDto } from './dto/creer-livre.dto';
import { CreerCategorieDto } from './dto/creer-categorie.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async stats() {
    const [utilisateurs, livres, achatsSucces, revenus] = await Promise.all([
      this.prisma.utilisateur.count({
        where: { ...actif, role: Role.USER },
      }),
      this.prisma.livre.count({ where: actif }),
      this.prisma.achat.count({
        where: { ...actif, statut: 'SUCCES' },
      }),
      this.prisma.achat.aggregate({
        where: { ...actif, statut: 'SUCCES' },
        _sum: { montant: true },
      }),
    ]);

    const ventesParLivre = await this.prisma.achat.groupBy({
      by: ['livreId'],
      where: { ...actif, statut: 'SUCCES' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const livreIds = ventesParLivre.map((v) => v.livreId);
    const livresMap = await this.prisma.livre.findMany({
      where: { id: { in: livreIds } },
      select: { id: true, titre: true },
    });
    const titreParId = Object.fromEntries(
      livresMap.map((l) => [l.id, l.titre]),
    );

    return {
      utilisateurs,
      livres,
      achatsReussis: achatsSucces,
      chiffreAffaires: Number(revenus._sum.montant ?? 0),
      topVentes: ventesParLivre.map((v) => ({
        livreId: v.livreId,
        titre: titreParId[v.livreId] ?? '—',
        ventes: v._count.id,
      })),
    };
  }

  listerUtilisateurs() {
    return this.prisma.utilisateur.findMany({
      where: { ...actif, role: Role.USER },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        derniereConnexion: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  listerAchats() {
    return this.prisma.achat.findMany({
      where: actif,
      include: {
        utilisateur: {
          select: { email: true, nom: true, prenom: true },
        },
        livre: { select: { titre: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async creerLivre(
    dto: CreerLivreDto,
    fichier: Express.Multer.File,
    couverture?: Express.Multer.File,
  ) {
    const upload = await this.cloudinary.uploadPdf(
      fichier.buffer,
      fichier.originalname,
    );

    let couvertureUrl: string | undefined;
    if (couverture) {
      const img = await this.cloudinary.uploadImage(
        couverture.buffer,
        couverture.originalname,
      );
      couvertureUrl = img.url;
    }

    const livre = await this.prisma.livre.create({
      data: {
        titre: dto.titre,
        auteur: dto.auteur || null,
        resume: dto.resume,
        prix: dto.prix,
        devise: dto.devise ?? 'XAF',
        format: dto.format ?? 'PDF',
        categorieId: dto.categorieId,
        nombrePages: dto.nombrePages,
        anneePublication: dto.anneePublication,
        statut: dto.statut ?? LivreStatut.PUBLIE,
        fichierUrl: upload.secureUrl,
        fichierPublicId: upload.publicId,
        couvertureUrl,
      },
      select: {
        id: true,
        titre: true,
        prix: true,
        statut: true,
        couvertureUrl: true,
      },
    });

    return { ...livre, prix: Number(livre.prix) };
  }

  async modifierLivre(id: string, data: Partial<CreerLivreDto>) {
    const livre = await this.prisma.livre.findFirst({
      where: { id, ...actif },
    });
    if (!livre) throw new NotFoundException('Livre introuvable');

    const updated = await this.prisma.livre.update({
      where: { id },
      data: {
        ...(data.titre && { titre: data.titre }),
        ...(data.auteur !== undefined && { auteur: data.auteur || null }),
        ...(data.resume !== undefined && { resume: data.resume }),
        ...(data.prix && { prix: data.prix }),
        ...(data.statut && { statut: data.statut }),
        ...(data.categorieId !== undefined && {
          categorieId: data.categorieId,
        }),
      },
    });
    return { ...updated, prix: Number(updated.prix) };
  }

  async supprimerLivre(id: string) {
    await this.prisma.livre.update({
      where: { id },
      data: { deletedAt: new Date(), statut: LivreStatut.ARCHIVE },
    });
    return { message: 'Livre archivé (soft delete)' };
  }

  creerCategorie(dto: CreerCategorieDto) {
    return this.prisma.categorie.create({ data: dto });
  }

  listerLivresAdmin() {
    return this.prisma.livre.findMany({
      where: actif,
      select: {
        id: true,
        titre: true,
        prix: true,
        statut: true,
        format: true,
        createdAt: true,
        _count: { select: { achats: { where: { statut: 'SUCCES', ...actif } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Crée l’admin initial si absent (seed). */
  async ensureAdmin(email: string, motDePasse: string) {
    const existant = await this.prisma.utilisateur.findFirst({
      where: { email: email.toLowerCase() },
    });
    if (existant) return existant;

    const hash = await bcrypt.hash(motDePasse, 10);
    return this.prisma.utilisateur.create({
      data: {
        nom: 'Ecrivain',
        prenom: 'Admin',
        email: email.toLowerCase(),
        motDePasseHash: hash,
        role: Role.ADMIN,
      },
    });
  }
}
