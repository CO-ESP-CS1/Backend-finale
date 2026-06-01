-- Verrouillage progressif après échecs de connexion
ALTER TABLE "utilisateur"
  ADD COLUMN "login_failed_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "login_locked_until" TIMESTAMP(3),
  ADD COLUMN "login_lockout_tier" INTEGER NOT NULL DEFAULT 0;
