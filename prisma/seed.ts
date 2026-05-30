import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';

const BCRYPT_ROUNDS = 10;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL manquant dans .env');
  }

  const email = (process.env.ADMIN_EMAIL ?? 'admin@ecrivain.local').toLowerCase();
  const motDePasse = process.env.ADMIN_MOT_DE_PASSE ?? 'Admin123!';

  const pool = new Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const hash = await bcrypt.hash(motDePasse, BCRYPT_ROUNDS);

    const existant = await prisma.utilisateur.findFirst({
      where: { email },
    });

    if (existant) {
      await prisma.utilisateur.update({
        where: { id: existant.id },
        data: {
          nom: 'Ecrivain',
          prenom: 'Admin',
          role: Role.ADMIN,
          motDePasseHash: hash,
          deletedAt: null,
        },
      });
      console.log(`Admin mis à jour : ${email}`);
    } else {
      await prisma.utilisateur.create({
        data: {
          nom: 'Ecrivain',
          prenom: 'Admin',
          email,
          motDePasseHash: hash,
          role: Role.ADMIN,
        },
      });
      console.log(`Admin créé : ${email}`);
    }

    console.log('Mot de passe : (valeur ADMIN_MOT_DE_PASSE dans .env)');
    console.log('Postman → A1 — Connexion admin');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
