-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "LivreFormat" AS ENUM ('PDF', 'EPUB', 'MOBI');

-- CreateEnum
CREATE TYPE "LivreStatut" AS ENUM ('PUBLIE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "AchatStatut" AS ENUM ('EN_ATTENTE', 'SUCCES', 'ECHEC');

-- CreateTable
CREATE TABLE "utilisateur" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "mot_de_passe_hash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "derniere_connexion" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorie" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "categorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livre" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "titre" VARCHAR(300) NOT NULL,
    "resume" TEXT,
    "couverture_url" VARCHAR(500),
    "fichier_url" VARCHAR(1000) NOT NULL,
    "fichier_public_id" VARCHAR(500),
    "format" "LivreFormat" NOT NULL DEFAULT 'PDF',
    "prix" DECIMAL(10,2) NOT NULL,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "nombre_pages" INTEGER,
    "annee_publication" INTEGER,
    "categorie_id" UUID,
    "statut" "LivreStatut" NOT NULL DEFAULT 'PUBLIE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "livre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achat" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "utilisateur_id" UUID NOT NULL,
    "livre_id" UUID NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "operateur" VARCHAR(50) NOT NULL,
    "numero_telephone" VARCHAR(20),
    "ref_transaction" VARCHAR(200),
    "statut" "AchatStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "achat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lien_lecture" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "achat_id" UUID NOT NULL,
    "utilisateur_id" UUID NOT NULL,
    "livre_id" UUID NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "lien_lecture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_key" ON "utilisateur"("email");

-- CreateIndex
CREATE INDEX "utilisateur_email_idx" ON "utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categorie_nom_key" ON "categorie"("nom");

-- CreateIndex
CREATE INDEX "livre_statut_idx" ON "livre"("statut");

-- CreateIndex
CREATE INDEX "livre_titre_idx" ON "livre"("titre");

-- CreateIndex
CREATE INDEX "livre_categorie_id_idx" ON "livre"("categorie_id");

-- CreateIndex
CREATE INDEX "livre_prix_idx" ON "livre"("prix");

-- CreateIndex
CREATE UNIQUE INDEX "achat_ref_transaction_key" ON "achat"("ref_transaction");

-- CreateIndex
CREATE INDEX "achat_utilisateur_id_idx" ON "achat"("utilisateur_id");

-- CreateIndex
CREATE INDEX "achat_statut_idx" ON "achat"("statut");

-- CreateIndex
CREATE INDEX "achat_utilisateur_id_livre_id_idx" ON "achat"("utilisateur_id", "livre_id");

-- CreateIndex
CREATE INDEX "achat_ref_transaction_idx" ON "achat"("ref_transaction");

-- CreateIndex
CREATE UNIQUE INDEX "achat_utilisateur_id_livre_id_key" ON "achat"("utilisateur_id", "livre_id");

-- CreateIndex
CREATE UNIQUE INDEX "lien_lecture_token_key" ON "lien_lecture"("token");

-- CreateIndex
CREATE INDEX "lien_lecture_token_idx" ON "lien_lecture"("token");

-- CreateIndex
CREATE INDEX "lien_lecture_achat_id_idx" ON "lien_lecture"("achat_id");

-- CreateIndex
CREATE INDEX "lien_lecture_expires_at_idx" ON "lien_lecture"("expires_at");

-- AddForeignKey
ALTER TABLE "livre" ADD CONSTRAINT "livre_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categorie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achat" ADD CONSTRAINT "achat_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achat" ADD CONSTRAINT "achat_livre_id_fkey" FOREIGN KEY ("livre_id") REFERENCES "livre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lien_lecture" ADD CONSTRAINT "lien_lecture_achat_id_fkey" FOREIGN KEY ("achat_id") REFERENCES "achat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lien_lecture" ADD CONSTRAINT "lien_lecture_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lien_lecture" ADD CONSTRAINT "lien_lecture_livre_id_fkey" FOREIGN KEY ("livre_id") REFERENCES "livre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
