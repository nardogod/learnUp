import { describe, it, expect } from "vitest";
import { validateSwedishGrammar } from "./llm";

const words = [
  { word: "jag", translation: "eu" },
  { word: "min", translation: "meu" },
  { word: "heter", translation: "chamar-se" },
  { word: "odlar", translation: "cultiva" },
  { word: "fru", translation: "esposa" },
  { word: "vän", translation: "amigo" },
  { word: "kvinna", translation: "mulher" },
];

describe("validateSwedishGrammar", () => {
  it("aceita Jag odlar", () => {
    expect(validateSwedishGrammar("Jag odlar", words).valid).toBe(true);
  });
  it("aceita Min fru", () => {
    expect(validateSwedishGrammar("Min fru", words).valid).toBe(true);
  });
  it("aceita Jag heter fru", () => {
    expect(validateSwedishGrammar("Jag heter fru", words).valid).toBe(true);
  });
  it("aceita Min fru odlar", () => {
    expect(validateSwedishGrammar("Min fru odlar", words).valid).toBe(true);
  });
  it("aceita Min vän heter fru", () => {
    expect(validateSwedishGrammar("Min vän heter fru", words).valid).toBe(true);
  });
  it("rejeita Min odlar", () => {
    const r = validateSwedishGrammar("Min odlar", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("substantivo");
  });
  it("rejeita Fru min", () => {
    const r = validateSwedishGrammar("Fru min", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("possessivo");
  });
  it("rejeita Vän kvinna", () => {
    const r = validateSwedishGrammar("Vän kvinna", words);
    expect(r.valid).toBe(false);
  });
  it("rejeita Jag kvinna", () => {
    const r = validateSwedishGrammar("Jag kvinna", words);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("verbo");
  });
});
