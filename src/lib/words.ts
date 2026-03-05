import { prisma } from "./db";

/** Chave normalizada para comparação (lowercase, trim) */
export function normalizeWordKey(word: string): string {
  return word.trim().toLowerCase();
}

/** Verifica se o usuário já tem palavra com mesma chave normalizada (case-insensitive) */
export async function findDuplicateWord(
  userId: string,
  word: string
): Promise<{ exists: true; existing: { word: string; translation: string } } | { exists: false }> {
  const key = normalizeWordKey(word);
  const all = await prisma.word.findMany({ where: { userId } });
  const existing = all.find((w) => normalizeWordKey(w.word) === key);
  if (!existing) return { exists: false };
  return { exists: true, existing: { word: existing.word, translation: existing.translation } };
}

/** Mescla traduções distintas (ex: "bom" + "bem" → "bom / bem") */
function mergeTranslations(existing: string, nova: string): string {
  const parts = existing.split(/\s*\/\s*/).map((p) => p.trim().toLowerCase());
  const novaNorm = nova.trim().toLowerCase();
  if (parts.includes(novaNorm)) return existing;
  return `${existing} / ${nova.trim()}`;
}

/** Remove duplicatas do vocabulário. Mantém a primeira ocorrência e mescla traduções diferentes. */
export async function deduplicateUserWords(userId: string): Promise<number> {
  const words = await prisma.word.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  const seen = new Map<string, { id: string; translation: string }>();
  const toDelete: string[] = [];
  const updates = new Map<string, string>();

  for (const w of words) {
    const key = normalizeWordKey(w.word);
    const entry = seen.get(key);
    if (entry) {
      toDelete.push(w.id);
      const merged = mergeTranslations(entry.translation, w.translation);
      if (merged !== entry.translation) {
        entry.translation = merged;
        updates.set(entry.id, merged);
      }
    } else {
      seen.set(key, { id: w.id, translation: w.translation });
    }
  }

  for (const [id, translation] of updates) {
    await prisma.word.update({ where: { id }, data: { translation } });
  }
  if (toDelete.length > 0) {
    await prisma.word.deleteMany({ where: { id: { in: toDelete } } });
  }
  return toDelete.length;
}
