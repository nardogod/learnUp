import { describe, it, expect } from "vitest";
import { getMessage, getLanguage } from "./messages";

describe("getLanguage", () => {
  it("maps português variants", () => {
    expect(getLanguage("português")).toBe("português");
    expect(getLanguage("portugues")).toBe("português");
    expect(getLanguage("pt")).toBe("português");
  });
  it("maps inglês variants", () => {
    expect(getLanguage("inglês")).toBe("inglês");
    expect(getLanguage("english")).toBe("inglês");
    expect(getLanguage("en")).toBe("inglês");
  });
  it("maps svenska variants", () => {
    expect(getLanguage("svenska")).toBe("svenska");
    expect(getLanguage("sv")).toBe("svenska");
  });
  it("defaults to português for unknown", () => {
    expect(getLanguage("xyz")).toBe("português");
  });
});

describe("getMessage", () => {
  it("returns message in correct language", () => {
    expect(getMessage("português", "newWord")).toContain("palavra");
    expect(getMessage("inglês", "newWord")).toContain("word");
    expect(getMessage("svenska", "newWord")).toContain("ord");
  });
  it("replaces params", () => {
    const msg = getMessage("português", "whatMeans", { word: "jag" });
    expect(msg).toContain("jag");
  });
  it("returns key if missing", () => {
    expect(getMessage("português", "nonexistent")).toBe("nonexistent");
  });
});
