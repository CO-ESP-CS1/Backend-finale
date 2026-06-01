import { Injectable } from '@nestjs/common';
import { NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { actif } from '../common/soft-delete';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async notifierAdminsCompteSupprime(
    utilisateurId: string,
    prenom: string,
    nom: string,
    email: string,
    motif: string,
  ) {
    const admins = await this.prisma.utilisateur.findMany({
      where: { role: Role.ADMIN, ...actif },
      select: { id: true },
    });

    if (admins.length === 0) return;

    const nomComplet = `${prenom} ${nom}`.trim();
    const extraitMotif =
      motif.length > 200 ? `${motif.slice(0, 197)}…` : motif;

    await this.prisma.notification.createMany({
      data: admins.map((a) => ({
        utilisateurId: a.id,
        type: NotificationType.COMPTE_SUPPRIME,
        titre: 'Compte utilisateur supprimé',
        message: `${nomComplet} (${email}) a supprimé son compte. Motif : ${extraitMotif}`,
        lien: '/admin/utilisateurs',
      })),
    });
  }

  async notifierAdminsPaiementSoumis(achatId: string, titreLivre: string) {
    const admins = await this.prisma.utilisateur.findMany({
      where: { role: Role.ADMIN, ...actif },
      select: { id: true },
    });

    if (admins.length === 0) return;

    await this.prisma.notification.createMany({
      data: admins.map((a) => ({
        utilisateurId: a.id,
        type: NotificationType.PAIEMENT_SOUMIS,
        titre: 'Preuve de paiement reçue',
        message: `Un client a soumis une preuve pour « ${titreLivre} ».`,
        lien: `/admin/achats/${achatId}`,
        achatId,
      })),
    });
  }

  async notifierClient(
    utilisateurId: string,
    type: NotificationType,
    titre: string,
    message: string,
    lien?: string,
    achatId?: string,
  ) {
    return this.prisma.notification.create({
      data: {
        utilisateurId,
        type,
        titre,
        message,
        lien,
        achatId,
      },
    });
  }

  lister(utilisateurId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { utilisateurId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async compterNonLues(utilisateurId: string) {
    return this.prisma.notification.count({
      where: { utilisateurId, lu: false },
    });
  }

  async marquerLue(id: string, utilisateurId: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { id, utilisateurId },
    });
    if (!notif) return null;

    return this.prisma.notification.update({
      where: { id },
      data: { lu: true },
    });
  }

  async marquerToutesLues(utilisateurId: string) {
    await this.prisma.notification.updateMany({
      where: { utilisateurId, lu: false },
      data: { lu: true },
    });
    return { message: 'Toutes les notifications ont été marquées comme lues' };
  }
}
