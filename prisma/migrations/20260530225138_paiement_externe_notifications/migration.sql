-- CreateEnum
CREATE TYPE "TypePaiement" AS ENUM ('INTERNE', 'EXTERNE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PAIEMENT_SOUMIS', 'PAIEMENT_VALIDE', 'PAIEMENT_REFUSE');

-- AlterEnum
ALTER TYPE "AchatStatut" ADD VALUE 'PAIEMENT_SOUMIS';

-- AlterTable
ALTER TABLE "achat" ADD COLUMN     "motif_refus" VARCHAR(500),
ADD COLUMN     "type_paiement" "TypePaiement" NOT NULL DEFAULT 'INTERNE';

-- CreateTable
CREATE TABLE "soumission_paiement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "achat_id" UUID NOT NULL,
    "ref_transaction" VARCHAR(200) NOT NULL,
    "nom_banque" VARCHAR(200) NOT NULL,
    "montant_declare" DECIMAL(12,2) NOT NULL,
    "devise_declare" VARCHAR(10) NOT NULL,
    "date_paiement" TIMESTAMP(3) NOT NULL,
    "preuve_url_1" VARCHAR(500) NOT NULL,
    "preuve_url_2" VARCHAR(500),
    "preuve_public_id_1" VARCHAR(500) NOT NULL,
    "preuve_public_id_2" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soumission_paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "utilisateur_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "titre" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "lien" VARCHAR(500),
    "achat_id" UUID,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "soumission_paiement_achat_id_key" ON "soumission_paiement"("achat_id");

-- CreateIndex
CREATE INDEX "notification_utilisateur_id_lu_idx" ON "notification"("utilisateur_id", "lu");

-- CreateIndex
CREATE INDEX "notification_created_at_idx" ON "notification"("created_at");

-- CreateIndex
CREATE INDEX "achat_type_paiement_idx" ON "achat"("type_paiement");

-- AddForeignKey
ALTER TABLE "soumission_paiement" ADD CONSTRAINT "soumission_paiement_achat_id_fkey" FOREIGN KEY ("achat_id") REFERENCES "achat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_achat_id_fkey" FOREIGN KEY ("achat_id") REFERENCES "achat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
