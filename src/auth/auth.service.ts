import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { actif } from '../common/soft-delete';
import { JwtPayload } from './auth.types';
import { InscriptionDto } from './dto/inscription.dto';
import { ConnexionDto } from './dto/connexion.dto';
import { ChangerMotDePasseDto } from './dto/changer-mot-de-passe.dto';
import { ModifierProfilDto } from './dto/modifier-profil.dto';
import { SupprimerCompteDto } from './dto/supprimer-compte.dto';
import { NotificationsService } from '../notifications/notifications.service';
import {
  formatLockoutMessage,
  lockoutDurationMs,
  MAX_LOGIN_ATTEMPTS,
} from './login-lockout.constants';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private notifications: NotificationsService,
  ) {}

  async inscription(dto: InscriptionDto) {
    const existant = await this.prisma.utilisateur.findFirst({
      where: { email: dto.email.toLowerCase(), ...actif },
    });
    if (existant) {
      throw new ConflictException('Cet e-mail est déjà utilisé');
    }

    const hash = await bcrypt.hash(dto.motDePasse, BCRYPT_ROUNDS);
    const user = await this.prisma.utilisateur.create({
      data: {
        nom: dto.nom,
        prenom: dto.prenom,
        email: dto.email.toLowerCase(),
        motDePasseHash: hash,
        role: Role.USER,
      },
    });

    return this.emitToken(user);
  }

  async connexion(dto: ConnexionDto) {
    const user = await this.prisma.utilisateur.findFirst({
      where: { email: dto.email.toLowerCase(), ...actif },
    });
    if (!user) {
      throw new UnauthorizedException('E-mail ou mot de passe incorrect');
    }

    if (user.loginLockedUntil && user.loginLockedUntil.getTime() > Date.now()) {
      throw new HttpException(
        {
          message: formatLockoutMessage(),
          lockedUntil: user.loginLockedUntil.toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (user.loginLockedUntil && user.loginLockedUntil.getTime() <= Date.now()) {
      await this.prisma.utilisateur.update({
        where: { id: user.id },
        data: { loginLockedUntil: null },
      });
    }

    const ok = await bcrypt.compare(dto.motDePasse, user.motDePasseHash);
    if (!ok) {
      const echec = await this.enregistrerEchecConnexion(
        user.id,
        user.loginLockoutTier,
      );
      if (echec.lockedUntil) {
        throw new HttpException(
          {
            message: formatLockoutMessage(),
            lockedUntil: echec.lockedUntil.toISOString(),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new UnauthorizedException({
        message: 'E-mail ou mot de passe incorrect',
        remainingAttempts: echec.remainingAttempts,
      });
    }

    await this.prisma.utilisateur.update({
      where: { id: user.id },
      data: {
        derniereConnexion: new Date(),
        loginFailedAttempts: 0,
        loginLockedUntil: null,
        loginLockoutTier: 0,
      },
    });

    return this.emitToken(user);
  }

  private async enregistrerEchecConnexion(
    userId: string,
    lockoutTierActuel: number,
  ): Promise<{ lockedUntil: Date | null; remainingAttempts: number }> {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      select: { loginFailedAttempts: true },
    });
    if (!user) return { lockedUntil: null, remainingAttempts: 0 };

    const attempts = user.loginFailedAttempts + 1;
    if (attempts < MAX_LOGIN_ATTEMPTS) {
      await this.prisma.utilisateur.update({
        where: { id: userId },
        data: { loginFailedAttempts: attempts },
      });
      return {
        lockedUntil: null,
        remainingAttempts: MAX_LOGIN_ATTEMPTS - attempts,
      };
    }

    const nouveauTier = lockoutTierActuel + 1;
    const lockedUntil = new Date(Date.now() + lockoutDurationMs(nouveauTier));

    await this.prisma.utilisateur.update({
      where: { id: userId },
      data: {
        loginFailedAttempts: 0,
        loginLockoutTier: nouveauTier,
        loginLockedUntil: lockedUntil,
      },
    });

    return { lockedUntil, remainingAttempts: 0 };
  }

  async changerMotDePasse(userId: string, dto: ChangerMotDePasseDto) {
    const user = await this.prisma.utilisateur.findFirst({
      where: { id: userId, ...actif },
    });
    if (!user) throw new UnauthorizedException();

    const ok = await bcrypt.compare(
      dto.ancienMotDePasse,
      user.motDePasseHash,
    );
    if (!ok) {
      throw new UnauthorizedException('Ancien mot de passe incorrect');
    }

    const hash = await bcrypt.hash(dto.nouveauMotDePasse, BCRYPT_ROUNDS);
    await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { motDePasseHash: hash },
    });
    return { message: 'Mot de passe mis à jour' };
  }

  async supprimerCompte(userId: string, dto: SupprimerCompteDto) {
    const user = await this.prisma.utilisateur.findFirst({
      where: { id: userId, ...actif },
    });
    if (!user) throw new UnauthorizedException();
    if (user.role === Role.ADMIN) {
      throw new ForbiddenException(
        'Les comptes administrateur ne peuvent pas être supprimés depuis l’application.',
      );
    }

    const motif = dto.motif.trim();
    if (!motif) {
      throw new BadRequestException('Le motif de suppression est obligatoire.');
    }

    const emailOriginal = user.email;
    const emailAnonymise = `deleted.${user.id}@suppressed.local`;

    await this.prisma.utilisateur.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        motifSuppression: motif,
        emailSupprime: emailOriginal,
        email: emailAnonymise,
        loginFailedAttempts: 0,
        loginLockedUntil: null,
        loginLockoutTier: 0,
      },
    });

    await this.notifications.notifierAdminsCompteSupprime(
      userId,
      user.prenom,
      user.nom,
      emailOriginal,
      motif,
    );

    return { message: 'Votre compte a été supprimé.' };
  }

  async profil(userId: string) {
    const user = await this.prisma.utilisateur.findFirst({
      where: { id: userId, ...actif },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        derniereConnexion: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  async modifierProfil(userId: string, dto: ModifierProfilDto) {
    const user = await this.prisma.utilisateur.findFirst({
      where: { id: userId, ...actif },
    });
    if (!user) throw new UnauthorizedException();

    const nom = dto.nom.trim();
    const prenom = dto.prenom.trim();
    if (!nom || !prenom) {
      throw new BadRequestException('Le nom et le prénom sont obligatoires');
    }

    return this.prisma.utilisateur.update({
      where: { id: userId },
      data: { nom, prenom },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        derniereConnexion: true,
        createdAt: true,
      },
    });
  }

  private emitToken(user: {
    id: string;
    email: string;
    role: Role;
    nom: string;
    prenom: string;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwt.sign(payload);
    return {
      accessToken,
      utilisateur: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
      },
    };
  }
}
