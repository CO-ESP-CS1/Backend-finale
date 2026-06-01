import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AchatStatut,
  LivreStatut,
  NotificationType,
  Role,
  TypePaiement,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { actif } from '../common/soft-delete';
import { PawapayService } from '../pawapay/pawapay.service';
import { PawapayDepositCallback } from '../pawapay/pawapay.types';
import { InitierAchatDto } from './dto/initier-achat.dto';
import { InitierAchatExterneDto } from './dto/initier-achat-externe.dto';
import { SoumettrePreuveDto } from './dto/soumettre-preuve.dto';
import {
  PAWAPAY_DEVISE_DEFAUT,
  PAWAPAY_PROVIDER_DEFAUT,
} from '../pawapay/pawapay.constants';
import {
  ACHAT_STATUTS_BLOQUANTS,
  OPERATEUR_VIREMENT_INTERNATIONAL,
} from './achats.constants';
import { coordonneesBancairesFromEnv } from './paiement-externe.config';
import { DEVISES_INTERNATIONALES } from '../common/constants/devises.constants';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotificationsService } from '../notifications/notifications.service';

const PREUVE_MAX_BYTES = 8 * 1024 * 1024;
const PREUVE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

@Injectable()
export class AchatsService {
  constructor(
    private prisma: PrismaService,
    private pawapay: PawapayService,
    private config: ConfigService,
    private cloudinary: CloudinaryService,
    private notifications: NotificationsService,
  ) {}

  devisesSupportees() {
    return { devises: DEVISES_INTERNATIONALES };
  }

  coordonneesBancaires() {
    return coordonneesBancairesFromEnv(this.config);
  }

  private async verifierConflitAchat(utilisateurId: string, livreId: string) {
    const achatExistant = await this.prisma.achat.findFirst({
      where: {
        utilisateurId,
        livreId,
        ...actif,
        statut: { in: [...ACHAT_STATUTS_BLOQUANTS] },
      },
    });
    if (achatExistant?.statut === AchatStatut.SUCCES) {
      throw new ConflictException('Vous possédez déjà ce livre');
    }
    if (achatExistant) {
      throw new ConflictException(
        'Un paiement est déjà en cours pour ce livre',
      );
    }
  }

  async initier(utilisateurId: string, dto: InitierAchatDto) {
    const livre = await this.prisma.livre.findFirst({
      where: { id: dto.livreId, ...actif, statut: LivreStatut.PUBLIE },
    });
    if (!livre) throw new NotFoundException('Livre introuvable');

    await this.verifierConflitAchat(utilisateurId, dto.livreId);

    const montant = Number(livre.prix);
    const operateur =
      dto.operateur ??
      this.config.get<string>('PAWAPAY_DEFAULT_PROVIDER', PAWAPAY_PROVIDER_DEFAUT);
    const devise = livre.devise || PAWAPAY_DEVISE_DEFAUT;

    const achat = await this.prisma.achat.create({
      data: {
        utilisateurId,
        livreId: livre.id,
        montant: livre.prix,
        devise,
        typePaiement: TypePaiement.INTERNE,
        operateur,
        numeroTelephone: dto.numeroTelephone,
        statut: AchatStatut.EN_ATTENTE,
      },
    });

    const amountStr = String(Math.round(montant));
    const reponse = await this.pawapay.initierDepot({
      depositId: achat.id,
      amount: amountStr,
      currency: devise,
      phoneNumber: dto.numeroTelephone,
      provider: operateur,
    });

    if (reponse.status === 'REJECTED') {
      await this.prisma.achat.update({
        where: { id: achat.id },
        data: { statut: AchatStatut.ECHEC, deletedAt: new Date() },
      });
      throw new BadRequestException(
        reponse.failureReason?.failureMessage ?? 'Paiement refusé par Pawapay',
      );
    }

    return {
      achatId: achat.id,
      depositId: achat.id,
      typePaiement: TypePaiement.INTERNE,
      statut: AchatStatut.EN_ATTENTE,
      pawapay: reponse,
      message: this.pawapay.isSimulate()
        ? 'Mode simulation : POST /achats/:id/confirmer-simulation'
        : 'Paiement initié (sandbox). Le statut final arrive via callback Pawapay sur /api/webhooks/pawapay/deposits',
    };
  }

  async initierExterne(utilisateurId: string, dto: InitierAchatExterneDto) {
    const livre = await this.prisma.livre.findFirst({
      where: { id: dto.livreId, ...actif, statut: LivreStatut.PUBLIE },
    });
    if (!livre) throw new NotFoundException('Livre introuvable');

    await this.verifierConflitAchat(utilisateurId, dto.livreId);
    this.coordonneesBancaires();

    const achat = await this.prisma.achat.create({
      data: {
        utilisateurId,
        livreId: livre.id,
        montant: livre.prix,
        devise: livre.devise || PAWAPAY_DEVISE_DEFAUT,
        typePaiement: TypePaiement.EXTERNE,
        operateur: OPERATEUR_VIREMENT_INTERNATIONAL,
        statut: AchatStatut.EN_ATTENTE,
      },
    });

    const coords = this.coordonneesBancaires();

    return {
      achatId: achat.id,
      typePaiement: TypePaiement.EXTERNE,
      statut: AchatStatut.EN_ATTENTE,
      montant: Number(achat.montant),
      devise: achat.devise,
      livre: {
        id: livre.id,
        titre: livre.titre,
        couvertureUrl: livre.couvertureUrl,
      },
      coordonneesBancaires: coords,
      referenceCommande: `${coords.referencePrefix}-${achat.id.slice(0, 8).toUpperCase()}`,
      message:
        'Commande créée. Effectuez le virement puis soumettez votre preuve de paiement.',
    };
  }

  async listerExternesEnAttente(utilisateurId: string) {
    const achats = await this.prisma.achat.findMany({
      where: {
        utilisateurId,
        typePaiement: TypePaiement.EXTERNE,
        ...actif,
        statut: { in: [AchatStatut.EN_ATTENTE, AchatStatut.PAIEMENT_SOUMIS] },
      },
      include: {
        livre: {
          select: { id: true, titre: true, couvertureUrl: true },
        },
        soumissionPaiement: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return achats.map((a) => ({
      id: a.id,
      statut: a.statut,
      montant: Number(a.montant),
      devise: a.devise,
      createdAt: a.createdAt,
      livre: a.livre,
      preuveSoumise: !!a.soumissionPaiement,
      motifRefus: a.motifRefus,
    }));
  }

  async soumettrePreuve(
    achatId: string,
    utilisateurId: string,
    dto: SoumettrePreuveDto,
    fichiers: Express.Multer.File[],
  ) {
    const achat = await this.prisma.achat.findFirst({
      where: {
        id: achatId,
        utilisateurId,
        typePaiement: TypePaiement.EXTERNE,
        ...actif,
      },
      include: { livre: { select: { titre: true } } },
    });

    if (!achat) throw new NotFoundException('Commande introuvable');
    if (achat.statut !== AchatStatut.EN_ATTENTE) {
      throw new BadRequestException(
        'Cette commande n’accepte plus de preuve de paiement',
      );
    }

    if (!fichiers?.length) {
      throw new BadRequestException('Au moins une preuve est requise');
    }
    if (fichiers.length > 2) {
      throw new BadRequestException('Maximum 2 fichiers de preuve');
    }

    for (const f of fichiers) {
      if (f.size > PREUVE_MAX_BYTES) {
        throw new BadRequestException(
          `Fichier trop volumineux (max ${PREUVE_MAX_BYTES / 1024 / 1024} Mo)`,
        );
      }
      if (!PREUVE_MIME.has(f.mimetype)) {
        throw new BadRequestException(
          'Formats acceptés : JPEG, PNG, WebP ou PDF',
        );
      }
    }

    const uploads = await Promise.all(
      fichiers.map((f) =>
        this.cloudinary.uploadPreuve(f.buffer, f.originalname, f.mimetype),
      ),
    );

    const datePaiement = new Date(dto.datePaiement);
    if (Number.isNaN(datePaiement.getTime())) {
      throw new BadRequestException('Date de paiement invalide');
    }

    await this.prisma.$transaction([
      this.prisma.soumissionPaiement.create({
        data: {
          achatId: achat.id,
          refTransaction: dto.refTransaction.trim(),
          nomBanque: dto.nomBanque.trim(),
          montantDeclare: dto.montantDeclare,
          deviseDeclare: dto.deviseDeclare,
          datePaiement,
          preuveUrl1: uploads[0].url,
          preuvePublicId1: uploads[0].publicId,
          preuveUrl2: uploads[1]?.url,
          preuvePublicId2: uploads[1]?.publicId,
        },
      }),
      this.prisma.achat.update({
        where: { id: achat.id },
        data: { statut: AchatStatut.PAIEMENT_SOUMIS },
      }),
    ]);

    await this.notifications.notifierAdminsPaiementSoumis(
      achat.id,
      achat.livre.titre,
    );

    return {
      achatId: achat.id,
      statut: AchatStatut.PAIEMENT_SOUMIS,
      message:
        'Preuve enregistrée. Validation sous 24 h en moyenne — aucune action supplémentaire requise.',
    };
  }

  async traiterCallback(callback: PawapayDepositCallback) {
    const achat = await this.prisma.achat.findFirst({
      where: { id: callback.depositId, ...actif },
    });
    if (!achat) return { traite: false, raison: 'achat_introuvable' };
    if (achat.typePaiement !== TypePaiement.INTERNE) {
      return { traite: false, raison: 'achat_non_interne' };
    }

    if (achat.statut === AchatStatut.SUCCES) {
      return { traite: true, raison: 'deja_succes' };
    }

    if (callback.status === 'COMPLETED') {
      await this.prisma.achat.update({
        where: { id: achat.id },
        data: {
          statut: AchatStatut.SUCCES,
          refTransaction: callback.providerTransactionId ?? achat.refTransaction,
        },
      });
      return { traite: true, statut: AchatStatut.SUCCES };
    }

    if (callback.status === 'FAILED') {
      await this.prisma.achat.update({
        where: { id: achat.id },
        data: { statut: AchatStatut.ECHEC },
      });
      return { traite: true, statut: AchatStatut.ECHEC };
    }

    return { traite: true, statut: callback.status };
  }

  async confirmerSimulation(achatId: string, utilisateurId: string) {
    if (!this.pawapay.isSimulate()) {
      throw new BadRequestException(
        'Disponible uniquement en PAWAPAY_MODE=simulate',
      );
    }
    const achat = await this.prisma.achat.findFirst({
      where: { id: achatId, utilisateurId, ...actif },
    });
    if (!achat) throw new NotFoundException('Achat introuvable');
    if (achat.typePaiement !== TypePaiement.INTERNE) {
      throw new BadRequestException('Réservé aux paiements Mobile Money');
    }
    if (achat.statut !== AchatStatut.EN_ATTENTE) {
      throw new BadRequestException('Achat déjà traité');
    }

    const callback = this.pawapay.callbackSimule(achatId);
    return this.traiterCallback(callback);
  }

  async statut(achatId: string, utilisateurId: string) {
    const achat = await this.prisma.achat.findFirst({
      where: { id: achatId, utilisateurId, ...actif },
      include: {
        livre: {
          select: { id: true, titre: true, couvertureUrl: true },
        },
        soumissionPaiement: true,
      },
    });
    if (!achat) throw new NotFoundException('Achat introuvable');

    if (
      achat.typePaiement === TypePaiement.INTERNE &&
      achat.statut === AchatStatut.EN_ATTENTE &&
      !this.pawapay.isSimulate()
    ) {
      try {
        const distant = await this.pawapay.verifierStatut(achat.id);
        if (distant.status === 'COMPLETED' || distant.status === 'FAILED') {
          await this.traiterCallback({
            depositId: achat.id,
            status: distant.status,
            providerTransactionId: distant.providerTransactionId,
          });
          return this.statut(achatId, utilisateurId);
        }
      } catch {
        /* polling optionnel */
      }
    }

    const base = {
      id: achat.id,
      typePaiement: achat.typePaiement,
      statut: achat.statut,
      montant: Number(achat.montant),
      devise: achat.devise,
      livre: achat.livre,
      motifRefus: achat.motifRefus,
      createdAt: achat.createdAt,
      soumissionPaiement: achat.soumissionPaiement
        ? {
            refTransaction: achat.soumissionPaiement.refTransaction,
            nomBanque: achat.soumissionPaiement.nomBanque,
            montantDeclare: Number(achat.soumissionPaiement.montantDeclare),
            deviseDeclare: achat.soumissionPaiement.deviseDeclare,
            datePaiement: achat.soumissionPaiement.datePaiement,
            preuveUrl1: achat.soumissionPaiement.preuveUrl1,
            preuveUrl2: achat.soumissionPaiement.preuveUrl2,
            createdAt: achat.soumissionPaiement.createdAt,
          }
        : null,
    };

    if (
      achat.typePaiement === TypePaiement.EXTERNE &&
      achat.statut === AchatStatut.EN_ATTENTE
    ) {
      try {
        const coords = this.coordonneesBancaires();
        return {
          ...base,
          coordonneesBancaires: coords,
          referenceCommande: `${coords.referencePrefix}-${achat.id.slice(0, 8).toUpperCase()}`,
        };
      } catch {
        return base;
      }
    }

    return base;
  }

  async maBibliotheque(utilisateurId: string) {
    const achats = await this.prisma.achat.findMany({
      where: {
        utilisateurId,
        ...actif,
        statut: AchatStatut.SUCCES,
      },
      include: {
        livre: {
          select: {
            id: true,
            titre: true,
            auteur: true,
            resume: true,
            couvertureUrl: true,
            format: true,
            nombrePages: true,
            anneePublication: true,
            categorie: { select: { nom: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return achats.map((a) => ({
      achatId: a.id,
      acheteLe: a.createdAt,
      livre: a.livre,
    }));
  }

  async validerPaiementExterne(achatId: string) {
    const achat = await this.prisma.achat.findFirst({
      where: {
        id: achatId,
        typePaiement: TypePaiement.EXTERNE,
        statut: AchatStatut.PAIEMENT_SOUMIS,
        ...actif,
      },
      include: { livre: { select: { titre: true } } },
    });
    if (!achat) {
      throw new NotFoundException(
        'Commande introuvable ou non éligible à la validation',
      );
    }

    await this.assertPeutAccorderLivre(
      achat.utilisateurId,
      achat.livreId,
      achat.id,
      achat.createdAt,
    );

    await this.prisma.achat.update({
      where: { id: achatId },
      data: { statut: AchatStatut.SUCCES, motifRefus: null },
    });

    await this.notifications.notifierClient(
      achat.utilisateurId,
      NotificationType.PAIEMENT_VALIDE,
      'Paiement validé',
      `Votre paiement pour « ${achat.livre.titre} » a été confirmé. Le livre est dans votre bibliothèque.`,
      '/bibliotheque',
      achatId,
    );

    return { message: 'Paiement validé', statut: AchatStatut.SUCCES };
  }

  async revaliderPaiementExterne(
    achatId: string,
    adminId: string,
    motDePasseAdmin: string,
  ) {
    await this.verifierMotDePasseAdmin(adminId, motDePasseAdmin);

    const achat = await this.prisma.achat.findFirst({
      where: {
        id: achatId,
        typePaiement: TypePaiement.EXTERNE,
        statut: AchatStatut.ECHEC,
        ...actif,
      },
      include: {
        livre: { select: { titre: true } },
        soumissionPaiement: { select: { id: true } },
      },
    });
    if (!achat) {
      throw new NotFoundException(
        'Commande introuvable ou non éligible à la revalidation',
      );
    }
    if (!achat.soumissionPaiement) {
      throw new BadRequestException(
        'Cette commande refusée ne comporte pas de preuve de paiement.',
      );
    }

    await this.assertPeutAccorderLivre(
      achat.utilisateurId,
      achat.livreId,
      achat.id,
      achat.createdAt,
    );

    await this.prisma.achat.update({
      where: { id: achatId },
      data: { statut: AchatStatut.SUCCES, motifRefus: null },
    });

    await this.notifications.notifierClient(
      achat.utilisateurId,
      NotificationType.PAIEMENT_VALIDE,
      'Paiement validé',
      `Votre paiement pour « ${achat.livre.titre} » a été confirmé après réexamen. Le livre est dans votre bibliothèque.`,
      '/bibliotheque',
      achatId,
    );

    return { message: 'Paiement revalidé', statut: AchatStatut.SUCCES };
  }

  async refuserPaiementExterne(achatId: string, motif?: string) {
    const achat = await this.prisma.achat.findFirst({
      where: {
        id: achatId,
        typePaiement: TypePaiement.EXTERNE,
        statut: AchatStatut.PAIEMENT_SOUMIS,
        ...actif,
      },
      include: { livre: { select: { titre: true } } },
    });
    if (!achat) {
      throw new NotFoundException(
        'Commande introuvable ou non éligible au refus',
      );
    }

    const motifFinal =
      motif?.trim() ||
      'Les informations fournies ne correspondent pas à notre relevé bancaire.';

    await this.prisma.achat.update({
      where: { id: achatId },
      data: {
        statut: AchatStatut.ECHEC,
        motifRefus: motifFinal,
      },
    });

    await this.notifications.notifierClient(
      achat.utilisateurId,
      NotificationType.PAIEMENT_REFUSE,
      'Paiement refusé',
      `Votre paiement pour « ${achat.livre.titre} » a été refusé : ${motifFinal}. Vous pouvez passer une nouvelle commande. S'il s'agit d'une erreur de notre part, veuillez nous contacter via la section « Nous contacter ».`,
      '/contacter',
      achatId,
    );

    return { message: 'Paiement refusé', statut: AchatStatut.ECHEC };
  }

  async detailAdmin(achatId: string) {
    const achat = await this.prisma.achat.findFirst({
      where: { id: achatId, ...actif },
      include: {
        utilisateur: {
          select: { id: true, nom: true, prenom: true, email: true },
        },
        livre: {
          select: { id: true, titre: true, prix: true, devise: true },
        },
        soumissionPaiement: true,
      },
    });
    if (!achat) throw new NotFoundException('Achat introuvable');

    const revalidation = await this.evaluerRevalidation(achat);

    return {
      ...achat,
      montant: Number(achat.montant),
      livre: {
        ...achat.livre,
        prix: Number(achat.livre.prix),
      },
      soumissionPaiement: achat.soumissionPaiement
        ? {
            ...achat.soumissionPaiement,
            montantDeclare: Number(achat.soumissionPaiement.montantDeclare),
          }
        : null,
      revalidation,
    };
  }

  private async verifierMotDePasseAdmin(adminId: string, motDePasse: string) {
    const admin = await this.prisma.utilisateur.findFirst({
      where: { id: adminId, role: Role.ADMIN, ...actif },
    });
    if (!admin) {
      throw new UnauthorizedException('Administrateur introuvable');
    }
    const ok = await bcrypt.compare(motDePasse, admin.motDePasseHash);
    if (!ok) {
      throw new UnauthorizedException('Mot de passe administrateur incorrect');
    }
  }

  /** Vérifie qu'accorder ce livre à ce client ne crée pas de doublon ni de conflit. */
  private async assertPeutAccorderLivre(
    utilisateurId: string,
    livreId: string,
    achatCourantId: string,
    achatCourantCreatedAt: Date,
  ) {
    const achatValideExistant = await this.prisma.achat.findFirst({
      where: {
        utilisateurId,
        livreId,
        statut: AchatStatut.SUCCES,
        id: { not: achatCourantId },
        ...actif,
      },
    });
    if (achatValideExistant) {
      throw new BadRequestException(
        'Ce client possède déjà ce livre via un autre achat validé.',
      );
    }

    const achatPlusRecent = await this.prisma.achat.findFirst({
      where: {
        utilisateurId,
        livreId,
        id: { not: achatCourantId },
        ...actif,
        createdAt: { gt: achatCourantCreatedAt },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (achatPlusRecent) {
      throw new BadRequestException(
        `Un achat plus récent existe pour ce livre (statut : ${achatPlusRecent.statut}). Traitez-le en priorité.`,
      );
    }
  }

  private async evaluerRevalidation(achat: {
    id: string;
    utilisateurId: string;
    livreId: string;
    createdAt: Date;
    typePaiement: TypePaiement;
    statut: AchatStatut;
    soumissionPaiement: unknown;
  }) {
    if (
      achat.typePaiement !== TypePaiement.EXTERNE ||
      achat.statut !== AchatStatut.ECHEC
    ) {
      return { eligible: false as const, raison: null };
    }
    if (!achat.soumissionPaiement) {
      return {
        eligible: false as const,
        raison: 'Aucune preuve de paiement enregistrée pour cette commande.',
      };
    }

    try {
      await this.assertPeutAccorderLivre(
        achat.utilisateurId,
        achat.livreId,
        achat.id,
        achat.createdAt,
      );
      return { eligible: true as const, raison: null };
    } catch (err) {
      const message =
        err instanceof BadRequestException
          ? (err.message as string)
          : 'Revalidation impossible pour cette commande.';
      return { eligible: false as const, raison: message };
    }
  }
}
