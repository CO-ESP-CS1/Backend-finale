import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { LivreStatut, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { actif } from '../common/soft-delete';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreerLivreDto } from './dto/creer-livre.dto';
import { ModifierLivreDto } from './dto/modifier-livre.dto';
import { CreerCategorieDto } from './dto/creer-categorie.dto';
import { ModifierCategorieDto } from './dto/modifier-categorie.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

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
    return this.prisma.achat
      .findMany({
        where: actif,
        include: {
          utilisateur: {
            select: { id: true, email: true, nom: true, prenom: true },
          },
          livre: { select: { id: true, titre: true } },
          soumissionPaiement: {
            select: { id: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
      .then((achats) =>
        achats.map((a) => ({
          ...a,
          montant: Number(a.montant),
        })),
      );
  }

  async creerLivre(
    dto: CreerLivreDto,
    fichier: Express.Multer.File,
    couverture?: Express.Multer.File,
  ) {
    try {
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
    } catch (err) {
      this.logger.error(
        `Échec création livre « ${dto.titre} » : ${err instanceof Error ? err.message : err}`,
        err instanceof Error ? err.stack : undefined,
      );
      if (err instanceof BadRequestException) throw err;
      const detail =
        err instanceof Error ? err.message : 'Erreur inconnue';
      throw new BadRequestException(
        `Publication impossible : ${detail}. Vérifiez Cloudinary (variables Render) et le format des fichiers.`,
      );
    }
  }

  async detailLivreAdmin(id: string) {
    const livre = await this.prisma.livre.findFirst({
      where: { id },
      select: {
        id: true,
        titre: true,
        auteur: true,
        resume: true,
        prix: true,
        devise: true,
        format: true,
        nombrePages: true,
        anneePublication: true,
        statut: true,
        couvertureUrl: true,
        createdAt: true,
        deletedAt: true,
        categorie: { select: { id: true, nom: true } },
      },
    });
    if (!livre) throw new NotFoundException('Livre introuvable');
    return { ...livre, prix: Number(livre.prix) };
  }

  async modifierLivre(
    id: string,
    data: ModifierLivreDto,
    fichier?: Express.Multer.File,
    couverture?: Express.Multer.File,
  ) {
    const livre = await this.prisma.livre.findFirst({ where: { id } });
    if (!livre) throw new NotFoundException('Livre introuvable');

    try {
      let fichierUrl = livre.fichierUrl;
      let fichierPublicId = livre.fichierPublicId;
      if (fichier) {
        const upload = await this.cloudinary.uploadPdf(
          fichier.buffer,
          fichier.originalname,
        );
        fichierUrl = upload.secureUrl;
        fichierPublicId = upload.publicId;
      }

      let couvertureUrl = livre.couvertureUrl;
      if (couverture) {
        const img = await this.cloudinary.uploadImage(
          couverture.buffer,
          couverture.originalname,
        );
        couvertureUrl = img.url;
      }

      const updated = await this.prisma.livre.update({
        where: { id },
        data: {
          ...(data.titre !== undefined && { titre: data.titre }),
          ...(data.auteur !== undefined && { auteur: data.auteur || null }),
          ...(data.resume !== undefined && { resume: data.resume }),
          ...(data.prix !== undefined && { prix: data.prix }),
          ...(data.devise !== undefined && { devise: data.devise }),
          ...(data.format !== undefined && { format: data.format }),
          ...(data.nombrePages !== undefined && {
            nombrePages: data.nombrePages,
          }),
          ...(data.anneePublication !== undefined && {
            anneePublication: data.anneePublication,
          }),
          ...(data.statut !== undefined && { statut: data.statut }),
          ...(fichier && { fichierUrl, fichierPublicId }),
          ...(couverture && { couvertureUrl }),
        },
        select: {
          id: true,
          titre: true,
          prix: true,
          statut: true,
          couvertureUrl: true,
        },
      });
      return { ...updated, prix: Number(updated.prix) };
    } catch (err) {
      this.logger.error(
        `Échec modification livre ${id} : ${err instanceof Error ? err.message : err}`,
        err instanceof Error ? err.stack : undefined,
      );
      if (err instanceof BadRequestException) throw err;
      const detail =
        err instanceof Error ? err.message : 'Erreur inconnue';
      throw new BadRequestException(
        `Modification impossible : ${detail}. Vérifiez le format des fichiers.`,
      );
    }
  }

  async supprimerLivre(id: string) {
    await this.prisma.livre.update({
      where: { id },
      data: { deletedAt: new Date(), statut: LivreStatut.ARCHIVE },
    });
    return { message: 'Livre archivé (soft delete)' };
  }

  async desarchiverLivre(id: string) {
    const livre = await this.prisma.livre.findFirst({ where: { id } });
    if (!livre) throw new NotFoundException('Livre introuvable');
    if (livre.deletedAt === null && livre.statut !== LivreStatut.ARCHIVE) {
      throw new BadRequestException("Ce livre n'est pas archivé");
    }

    const updated = await this.prisma.livre.update({
      where: { id },
      data: { deletedAt: null, statut: LivreStatut.PUBLIE },
      select: {
        id: true,
        titre: true,
        statut: true,
      },
    });
    return { message: 'Livre republié dans le catalogue', livre: updated };
  }

  creerCategorie(dto: CreerCategorieDto) {
    return this.prisma.categorie.create({ data: dto });
  }

  async modifierCategorie(id: string, dto: ModifierCategorieDto) {
    const cat = await this.prisma.categorie.findFirst({ where: { id } });
    if (!cat) throw new NotFoundException('Catégorie introuvable');
    if (!dto.nom?.trim() && dto.description === undefined) {
      throw new BadRequestException('Aucune modification fournie');
    }
    return this.prisma.categorie.update({
      where: { id },
      data: {
        ...(dto.nom !== undefined && { nom: dto.nom.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description || null,
        }),
      },
    });
  }

  listerLivresAdmin() {
    return this.prisma.livre
      .findMany({
        select: {
          id: true,
          titre: true,
          prix: true,
          devise: true,
          statut: true,
          format: true,
          couvertureUrl: true,
          createdAt: true,
          deletedAt: true,
          categorie: { select: { id: true, nom: true } },
          _count: {
            select: { achats: { where: { statut: 'SUCCES', ...actif } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      .then((livres) =>
        livres.map((l) => ({
          ...l,
          prix: Number(l.prix),
        })),
      );
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
