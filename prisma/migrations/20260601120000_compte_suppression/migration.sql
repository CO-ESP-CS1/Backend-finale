-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'COMPTE_SUPPRIME';

-- AlterTable
ALTER TABLE "utilisateur" ADD COLUMN "motif_suppression" VARCHAR(500),
ADD COLUMN "email_supprime" VARCHAR(255);
