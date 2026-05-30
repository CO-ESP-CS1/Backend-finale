import {
  ConflictException,
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

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
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

    const ok = await bcrypt.compare(dto.motDePasse, user.motDePasseHash);
    if (!ok) {
      throw new UnauthorizedException('E-mail ou mot de passe incorrect');
    }

    await this.prisma.utilisateur.update({
      where: { id: user.id },
      data: { derniereConnexion: new Date() },
    });

    return this.emitToken(user);
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
