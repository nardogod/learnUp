import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./nlp", () => ({ validateWithSpacy: vi.fn().mockResolvedValue(null) }));

import { validateSwedishGrammar } from "./llm";

const words = [
  { word: "jag", translation: "eu" },
  { word: "min", translation: "meu" },
  { word: "heter", translation: "chamar-se" },
  { word: "odlar", translation: "cultiva" },
  { word: "mår", translation: "estar (saúde)" },
  { word: "hur", translation: "como" },
  { word: "hej", translation: "oi" },
  { word: "fru", translation: "esposa" },
  { word: "vän", translation: "amigo" },
  { word: "kvinna", translation: "mulher" },
  { word: "Anna", translation: "Anna" },
  { word: "Maria", translation: "Maria" },
  { word: "du", translation: "você" },
  { word: "bra", translation: "bom" },
  { word: "och", translation: "e" },
  { word: "det", translation: "isso" },
  { word: "är", translation: "é" },
  { word: "varifrån", translation: "de onde" },
  { word: "ifrån", translation: "de" },
  { word: "kommer", translation: "vem" },
];

describe("validateSwedishGrammar", () => {
  it("aceita Jag odlar", () => {
    expect(validateSwedishGrammar("Jag odlar", words).valid).toBe(true);
  });
  it("aceita Min fru", () => {
    expect(validateSwedishGrammar("Min fru", words).valid).toBe(true);
  });
  it("aceita Jag heter Anna", () => {
    expect(validateSwedishGrammar("Jag heter Anna", words).valid).toBe(true);
  });
  it("aceita Min fru odlar", () => {
    expect(validateSwedishGrammar("Min fru odlar", words).valid).toBe(true);
  });
  it("aceita Min vän heter Maria", () => {
    expect(validateSwedishGrammar("Min vän heter Maria", words).valid).toBe(true);
  });
  it("rejeita Min odlar", () => {
    const r = validateSwedishGrammar("Min odlar", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toBeDefined();
  });
  it("rejeita Fru min", () => {
    const r = validateSwedishGrammar("Fru min", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toBeDefined();
  });
  it("rejeita Vän kvinna", () => {
    const r = validateSwedishGrammar("Vän kvinna", words);
    expect(r.valid).toBe(false);
  });
  it("rejeita Jag heter fru (heter exige nome próprio)", () => {
    const r = validateSwedishGrammar("Jag heter fru", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("nome próprio");
  });
  it("rejeita Min fru heter vän (heter exige nome próprio)", () => {
    const r = validateSwedishGrammar("Min fru heter vän", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("nome próprio");
  });
  it("aceita Hur mår du?", () => {
    expect(validateSwedishGrammar("Hur mår du", words).valid).toBe(true);
  });
  it("aceita Hej (interjeição isolada)", () => {
    expect(validateSwedishGrammar("Hej", words).valid).toBe(true);
  });
  it("rejeita Min mår (POSS + VERB)", () => {
    const r = validateSwedishGrammar("Min mår", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("proibida");
  });
  it("rejeita Min hur (POSS + ADV)", () => {
    const r = validateSwedishGrammar("Min hur", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toBeDefined();
  });
  it("rejeita Min Hej odlar (POSS + INTJ)", () => {
    const r = validateSwedishGrammar("Min Hej odlar", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("proibida");
  });
  it("aceita Mår du? (pergunta sim/não)", () => {
    expect(validateSwedishGrammar("Mår du", words).valid).toBe(true);
  });
  it("rejeita Odlar (verbo sem sujeito)", () => {
    const r = validateSwedishGrammar("Odlar", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("sujeito");
  });
  it("rejeita Heter Anna (verbo sem sujeito)", () => {
    const r = validateSwedishGrammar("Heter Anna", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("sujeito");
  });
  it("rejeita Anna (nome isolado)", () => {
    const r = validateSwedishGrammar("Anna", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("isolado");
  });
  it("rejeita Hur Hej (ADV + INTJ)", () => {
    const r = validateSwedishGrammar("Hur Hej", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("proibida");
  });
  it("rejeita Odlar mår (VERB + VERB)", () => {
    const r = validateSwedishGrammar("Odlar mår", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("proibida");
  });
  it("rejeita Du min (PRON + POSS)", () => {
    const r = validateSwedishGrammar("Du min", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("proibida");
  });
  it("rejeita Hej odlar (INTJ + VERB sem sujeito)", () => {
    const r = validateSwedishGrammar("Hej odlar", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("proibida");
  });
  it("rejeita Jag kvinna", () => {
    const r = validateSwedishGrammar("Jag kvinna", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("verbo");
  });
  it("rejeita Min bra (POSS + ADJ)", () => {
    const r = validateSwedishGrammar("Min bra", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("proibida");
  });
  it("rejeita Min och (POSS + CONJ)", () => {
    const r = validateSwedishGrammar("Min och", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toBeDefined();
  });
  it("rejeita Min det (POSS + DET)", () => {
    const r = validateSwedishGrammar("Min det", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("proibida");
  });
  it("rejeita Bra odlar (ADJ + VERB sem sujeito)", () => {
    const r = validateSwedishGrammar("Bra odlar", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("proibida");
  });
  it("aceita Jag är bra", () => {
    expect(validateSwedishGrammar("Jag är bra", words).valid).toBe(true);
  });
  it("aceita Det är bra", () => {
    expect(validateSwedishGrammar("Det är bra", words).valid).toBe(true);
  });
  it("aceita Min vän är bra", () => {
    expect(validateSwedishGrammar("Min vän är bra", words).valid).toBe(true);
  });
  it("rejeita Min ifrån (POSS + preposição)", () => {
    const r = validateSwedishGrammar("Min ifrån", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toBeDefined();
  });
  it("rejeita Min Varifrån heter Maria (POSS + ADV)", () => {
    const r = validateSwedishGrammar("Min Varifrån heter Maria", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toBeDefined();
  });
  it("aceita Varifrån kommer du", () => {
    expect(validateSwedishGrammar("Varifrån kommer du", words).valid).toBe(true);
  });
  it("aceita Jag mår bra, tack", () => {
    expect(validateSwedishGrammar("Jag mår bra tack", words).valid).toBe(true);
  });
});
