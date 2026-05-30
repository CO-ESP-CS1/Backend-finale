import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AchatStatut, LivreStatut } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { actif } from '../common/soft-delete';
import { PawapayService } from '../pawapay/pawapay.service';
import { PawapayDepositCallback } from '../pawapay/pawapay.types';
import { InitierAchatDto } from './dto/initier-achat.dto';
import {
  PAWAPAY_DEVISE_DEFAUT,
  PAWAPAY_PROVIDER_DEFAUT,
} from '../pawapay/pawapay.constants';

@Injectable()
export class AchatsService {
  constructor(
    private prisma: PrismaService,
    private pawapay: PawapayService,
    private config: ConfigService,
  ) {}

  async initier(utilisateurId: string, dto: InitierAchatDto) {
    const livre = await this.prisma.livre.findFirst({
      where: { id: dto.livreId, ...actif, statut: LivreStatut.PUBLIE },
    });
    if (!livre) throw new NotFoundException('Livre introuvable');

    const achatExistant = await this.prisma.achat.findFirst({
      where: {
        utilisateurId,
        livreId: dto.livreId,
        ...actif,
        statut: { in: [AchatStatut.EN_ATTENTE, AchatStatut.SUCCES] },
      },
    });
    if (achatExistant?.statut === AchatStatut.SUCCES) {
      throw new ConflictException('Vous possédez déjà ce livre');
    }
    if (achatExistant?.statut === AchatStatut.EN_ATTENTE) {
      throw new ConflictException(
        'Un paiement est déjà en cours pour ce livre',
      );
    }

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
      statut: AchatStatut.EN_ATTENTE,
      pawapay: reponse,
      message: this.pawapay.isSimulate()
        ? 'Mode simulation : POST /achats/:id/confirmer-simulation'
        : 'Paiement initié (sandbox). Le statut final arrive via callback Pawapay sur /api/webhooks/pawapay/deposits',
    };
  }

  async traiterCallback(callback: PawapayDepositCallback) {
    const achat = await this.prisma.achat.findFirst({
      where: { id: callback.depositId, ...actif },
    });
    if (!achat) return { traite: false, raison: 'achat_introuvable' };

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

  /** Dev / sandbox : confirme un achat comme en mode simulate. */
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
      },
    });
    if (!achat) throw new NotFoundException('Achat introuvable');

    if (
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

    return {
      id: achat.id,
      statut: achat.statut,
      montant: Number(achat.montant),
      devise: achat.devise,
      livre: achat.livre,
      createdAt: achat.createdAt,
    };
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
            resume: true,
            couvertureUrl: true,
            format: true,
            nombrePages: true,
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
}
