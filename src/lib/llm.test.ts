import { describe, it, expect } from "vitest";
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
    expect(r.reason).toContain("proibida");
  });
  it("rejeita Min Hej odlar (POSS + INTJ)", () => {
    const r = validateSwedishGrammar("Min Hej odlar", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("proibida");
  });
  it("rejeita Jag kvinna", () => {
    const r = validateSwedishGrammar("Jag kvinna", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("verbo");
  });
});
