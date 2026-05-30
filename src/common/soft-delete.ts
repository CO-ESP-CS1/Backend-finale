/** Filtre Prisma : exclut les enregistrements supprimés (soft delete). */
export const actif = { deletedAt: null } as const;
