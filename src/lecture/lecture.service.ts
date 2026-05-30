import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AchatStatut } from '@prisma/client';
import axios from 'axios';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { actif } from '../common/soft-delete';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class LectureService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
    private config: ConfigService,
  ) {}

  /** Génère un lien temporaire pour lire le livre (pas de téléchargement). */
  async genererLien(utilisateurId: string, achatId: string) {
    const achat = await this.prisma.achat.findFirst({
      where: {
        id: achatId,
        utilisateurId,
        ...actif,
        statut: AchatStatut.SUCCES,
      },
      include: { livre: true },
    });
    if (!achat) {
      throw new NotFoundException(
        'Achat introuvable ou paiement non validé',
      );
    }

    const dureeMin = this.config.get<number>('LECTURE_LIEN_DUREE_MINUTES', 120);
    const expiresAt = new Date(Date.now() + dureeMin * 60 * 1000);
    const token = randomBytes(32).toString('hex');

    await this.prisma.lienLecture.create({
      data: {
        achatId: achat.id,
        utilisateurId,
        livreId: achat.livreId,
        token,
        expiresAt,
      },
    });

    return {
      token,
      expiresAt,
      urlAcces: `/api/lecture/acces/${token}`,
      message:
        'Ouvrez urlAcces avec votre token JWT ou via le front — le fichier n’est pas téléchargeable directement.',
    };
  }

  /** Résout le token et renvoie l’URL Cloudinary signée pour lecture en ligne. */
  async accesLecture(token: string, utilisateurId?: string) {
    const lien = await this.validerLien(token, utilisateurId);

    const publicId = lien.livre.fichierPublicId;
    if (!publicId) {
      throw new NotFoundException(
        'Fichier non configuré pour la lecture sécurisée',
      );
    }

    const lectureUrl = this.cloudinary.urlLectureSignee(publicId);

    return {
      livreId: lien.livreId,
      titre: lien.livre.titre,
      format: lien.livre.format,
      lectureUrl,
      expiresAt: lien.expiresAt,
    };
  }

  /** Télécharge le PDF via Cloudinary (côté serveur) pour éviter les 401 navigateur. */
  async telechargerFichier(token: string, utilisateurId: string) {
    const lien = await this.validerLien(token, utilisateurId);
    const publicId = lien.livre.fichierPublicId;
    if (!publicId) {
      throw new NotFoundException(
        'Fichier non configuré pour la lecture sécurisée',
      );
    }

    const url = this.cloudinary.urlLectureSignee(publicId);
    try {
      const res = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 120_000,
      });
      return {
        buffer: Buffer.from(res.data),
        titre: lien.livre.titre,
        format: lien.livre.format,
      };
    } catch {
      throw new NotFoundException(
        'Impossible de récupérer le fichier sur Cloudinary — vérifiez la configuration ou republiez le livre',
      );
    }
  }

  private async validerLien(token: string, utilisateurId?: string) {
    const lien = await this.prisma.lienLecture.findFirst({
      where: { token, ...actif },
      include: {
        livre: true,
        achat: true,
      },
    });

    if (!lien) throw new NotFoundException('Lien de lecture invalide');
    if (lien.expiresAt < new Date()) {
      throw new ForbiddenException('Lien de lecture expiré — régénérez-en un');
    }
    if (utilisateurId && lien.utilisateurId !== utilisateurId) {
      throw new ForbiddenException('Ce lien ne vous appartient pas');
    }
    if (lien.achat.statut !== AchatStatut.SUCCES) {
      throw new ForbiddenException('Achat non validé');
    }

    return lien;
  }
}
