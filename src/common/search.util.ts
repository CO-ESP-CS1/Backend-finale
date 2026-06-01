/** Normalise pour recherche : sans accents, minuscules. */
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[''´`]/g, "'")
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchTokens(query: string): string[] {
  return normalizeSearchText(query).split(' ').filter(Boolean);
}

function scoreField(normText: string, query: string, weight: number): number {
  const tokens = searchTokens(query);
  const normQuery = normalizeSearchText(query);
  if (!normText || tokens.length === 0) return 0;

  if (normText === normQuery) return 100 * weight;
  if (normText.startsWith(normQuery)) return 80 * weight;
  if (tokens.every((t) => normText.includes(t))) return 50 * weight;
  if (tokens.some((t) => normText.includes(t))) return 15 * weight;
  return 0;
}

export function scoreLivreSearch(
  livre: {
    titre: string;
    auteur?: string | null;
    resume?: string | null;
    categorie?: { nom: string } | null;
  },
  query: string,
): number {
  return (
    scoreField(normalizeSearchText(livre.titre), query, 3) +
    scoreField(normalizeSearchText(livre.auteur ?? ''), query, 2) +
    scoreField(normalizeSearchText(livre.resume ?? ''), query, 1) +
    scoreField(normalizeSearchText(livre.categorie?.nom ?? ''), query, 1.5)
  );
}

export function filterLivresBySearch<
  T extends {
    titre: string;
    auteur?: string | null;
    resume?: string | null;
    categorie?: { nom: string } | null;
  },
>(livres: T[], query: string): T[] {
  const q = query.trim();
  if (!q) return livres;

  return livres
    .map((livre) => ({ livre, score: scoreLivreSearch(livre, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ livre }) => livre);
}
