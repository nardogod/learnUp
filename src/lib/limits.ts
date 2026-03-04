import type { User, Word } from "@prisma/client";

const FREE_WORD_LIMIT = 100;
const FREE_FRASE_PER_DAY = 3;
const FREE_MANUAL_FRASE_PER_DAY = 3;

export function canAddWord(user: User, wordCount: number): boolean {
  if (user.plan === "premium") return true;
  return wordCount < FREE_WORD_LIMIT;
}

export function getWordLimit(user: User): number {
  return user.plan === "premium" ? Infinity : FREE_WORD_LIMIT;
}

export function getPhrasesPerDay(user: User): number {
  if (user.plan === "premium" && user.phrasesPerDay) {
    return Math.min(10, Math.max(1, user.phrasesPerDay));
  }
  return FREE_FRASE_PER_DAY;
}

export function canUseManualFrase(
  user: User & { fraseCountToday?: number | null; lastFraseDate?: Date | null }
): boolean {
  if (user.plan === "premium") return true;
  const today = new Date().toDateString();
  const lastDate = user.lastFraseDate?.toDateString();
  if (lastDate !== today) return true;
  const count = user.fraseCountToday ?? 0;
  return count < FREE_MANUAL_FRASE_PER_DAY;
}

export function getRemainingFraseCount(
  user: User & { fraseCountToday?: number | null; lastFraseDate?: Date | null }
): number {
  if (user.plan === "premium") return Infinity;
  const today = new Date().toDateString();
  const lastDate = user.lastFraseDate?.toDateString();
  if (lastDate !== today) return FREE_MANUAL_FRASE_PER_DAY;
  const count = user.fraseCountToday ?? 0;
  return Math.max(0, FREE_MANUAL_FRASE_PER_DAY - count);
}
