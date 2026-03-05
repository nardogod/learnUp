import { describe, it, expect } from "vitest";
import {
  canAddWord,
  getWordLimit,
  getPhrasesPerDay,
  canUseManualFrase,
} from "./limits";
import type { User } from "@prisma/client";

const freeUser: User = {
  id: "1",
  telegramId: "123",
  email: null,
  name: "Test",
  username: null,
  firstName: null,
  nativeLanguage: "português",
  targetLanguage: "svenska",
  level: "iniciante",
  plan: "free",
  phrasesPerDay: null,
  timezone: null,
  welcomedAt: null,
  conversationState: null,
  tempWord: null,
  fraseCountToday: 0,
  lastFraseDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const premiumUser: User = {
  ...freeUser,
  plan: "premium",
  phrasesPerDay: 5,
};

describe("canAddWord", () => {
  it("allows free user under 100 words", () => {
    expect(canAddWord(freeUser, 50)).toBe(true);
    expect(canAddWord(freeUser, 99)).toBe(true);
  });
  it("blocks free user at 100 words", () => {
    expect(canAddWord(freeUser, 100)).toBe(false);
  });
  it("allows premium user unlimited", () => {
    expect(canAddWord(premiumUser, 500)).toBe(true);
  });
});

describe("getWordLimit", () => {
  it("returns 100 for free", () => {
    expect(getWordLimit(freeUser)).toBe(100);
  });
  it("returns Infinity for premium", () => {
    expect(getWordLimit(premiumUser)).toBe(Infinity);
  });
});

describe("getPhrasesPerDay", () => {
  it("returns 3 for free", () => {
    expect(getPhrasesPerDay(freeUser)).toBe(3);
  });
  it("returns phrasesPerDay for premium when set", () => {
    expect(getPhrasesPerDay(premiumUser)).toBe(5);
  });
  it("returns Infinity for premium when phrasesPerDay is null", () => {
    expect(getPhrasesPerDay({ ...premiumUser, phrasesPerDay: null })).toBe(Infinity);
  });
});

describe("canUseManualFrase", () => {
  it("allows when no usage today", () => {
    expect(canUseManualFrase({ ...freeUser, lastFraseDate: null })).toBe(true);
  });
  it("allows free user under 10 today", () => {
    expect(
      canUseManualFrase({
        ...freeUser,
        lastFraseDate: new Date(),
        fraseCountToday: 9,
      })
    ).toBe(true);
  });
  it("blocks free user at 10 today", () => {
    expect(
      canUseManualFrase({
        ...freeUser,
        lastFraseDate: new Date(),
        fraseCountToday: 10,
      })
    ).toBe(false);
  });
  it("allows premium unlimited", () => {
    expect(
      canUseManualFrase({
        ...premiumUser,
        fraseCountToday: 10,
      })
    ).toBe(true);
  });
});
