import { validateWithSpacy } from "./nlp";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:0.5b";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";

/** Indica qual LLM está configurado (para debug) */
export function getLLMProvider(): "groq" | "ollama" {
  return GROQ_API_KEY ? "groq" : "ollama";
}

export interface PhraseResult {
  sentenceTarget: string;
  sentenceNative: string;
  wordsUsed: string[];
  tip?: string;
}

function getGrammarRules(targetLanguage: string): string | null {
  const lang = targetLanguage.toLowerCase();
  if (lang.includes("svensk") || lang.includes("sueco") || lang.includes("swedish") || lang === "sv") {
    return "heter exige nome próprio (Anna, Erik). min exige substantivo depois (min fru, min vän). bra=adjetivo (Jag är bra). och=conjunção (Jag odlar och du mår). det=determinante (Det är bra). är=verbo de ligação (é/está). NUNCA: min+adjetivo, min+conjunção, min+det, min+verbo, min+advérbio. Ex válidos: Jag är bra, Det är bra, Min fru odlar. Ex inválidos: Min bra, Min och, Min det.";
  }
  if (lang.includes("inglês") || lang.includes("english") || lang === "en") {
    return "Verbos exigem sujeito. Possessivos (my, your) exigem substantivo depois. Forme frases gramaticalmente corretas.";
  }
  if (lang.includes("português") || lang.includes("portuguese") || lang === "pt") {
    return "Verbos exigem sujeito. Possessivos (meu, minha) exigem substantivo depois. Forme frases gramaticalmente corretas.";
  }
  return null;
}

function buildPrompt(
  targetLanguage: string,
  nativeLanguage: string,
  words: { word: string; translation: string }[],
  options?: { excludePhrases?: string[] }
): string {
  const wordsList = words
    .map((w) => `- "${w.word}": ${w.translation}`)
    .join("\n");
  const excludeNote =
    options?.excludePhrases && options.excludePhrases.length > 0
      ? `\nNÃO repita estas frases (já enviadas 2x hoje):\n${options.excludePhrases.map((p) => `- ${p}`).join("\n")}\n`
      : "";
  const allowedWords = words.map((w) => w.word).join(", ");
  const strictRule = `REGRA CRÍTICA - OBRIGATÓRIO: A frase em ${targetLanguage} deve conter APENAS estas palavras: [${allowedWords}]. NENHUMA outra palavra é permitida.`;

  const grammarRules = getGrammarRules(targetLanguage);
  const grammarNote = grammarRules
    ? `\nREGRAS GRAMATICAIS (obrigatório): ${grammarRules}\n`
    : "";

  return `Você é professor de ${targetLanguage}. O aluno fala ${nativeLanguage}.

Palavras PERMITIDAS (use SOMENTE estas): [${allowedWords}]
${wordsList}
${excludeNote}

${strictRule}
${grammarNote}

Gere:
1) Uma frase natural em ${targetLanguage} usando APENAS palavras da lista
2) Tradução em ${nativeLanguage}
3) Lista das palavras usadas (apenas as da lista)

Responda APENAS em JSON válido, sem markdown, sem explicações:
{"sentenceTarget":"...","sentenceNative":"...","wordsUsed":["..."]}
Opcional: adicione "tip" com dica gramatical ou cultural sobre as palavras usadas.`;
}

function parsePhraseResponse(raw: string): PhraseResult | null {
  let jsonStr = raw.trim();
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) jsonStr = match[1].trim();
  try {
    const parsed = JSON.parse(jsonStr) as PhraseResult;
    if (!parsed.sentenceTarget || !parsed.sentenceNative) return null;
    if (!Array.isArray(parsed.wordsUsed)) parsed.wordsUsed = [];
    return parsed;
  } catch {
    return null;
  }
}

/** Extrai palavras de uma frase (ignora pontuação) */
function extractWordsFromSentence(sentence: string): string[] {
  return sentence
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}]/gu, ""))
    .filter((w) => w.length > 0);
}

/** Léxico sueco: classificação POS (PRON, POSS, NOUN, PROPN, VERB_INTRANS, VERB_NAME, VERB_COPULA, ADV, INTJ, ADJ, CONJ, DET) */
const SWEDISH_LEXICON: Record<string, string> = {
  jag: "PRON",
  du: "PRON",
  han: "PRON",
  hon: "PRON",
  vi: "PRON",
  de: "PRON",
  min: "POSS",
  mitt: "POSS",
  mina: "POSS",
  din: "POSS",
  ditt: "POSS",
  dina: "POSS",
  heter: "VERB_NAME",
  odlar: "VERB_INTRANS",
  mår: "VERB_INTRANS",
  är: "VERB_COPULA",
  har: "VERB_INTRANS",
  går: "VERB_INTRANS",
  kommer: "VERB_INTRANS",
  hur: "ADV",
  var: "ADV",
  när: "ADV",
  varför: "ADV",
  vad: "ADV",
  varifrån: "ADV",
  vart: "ADV",
  ifrån: "ADP",
  hej: "INTJ",
  tack: "INTJ",
  nej: "INTJ",
  ja: "INTJ",
  bra: "ADJ",
  god: "ADJ",
  dålig: "ADJ",
  stor: "ADJ",
  liten: "ADJ",
  fin: "ADJ",
  vacker: "ADJ",
  och: "CONJ",
  men: "CONJ",
  eller: "CONJ",
  utan: "CONJ",
  det: "DET",
  den: "DET",
  detta: "DET",
  denna: "DET",
};

/** Nomes próprios suecos/nórdicos (heter exige PROPN como complemento) */
const SWEDISH_PROPER_NAMES = new Set([
  "anna", "erik", "maria", "johan", "lars", "sofia", "emma", "oscar", "alice", "william",
  "elisa", "axel", "maja", "hugo", "ella", "noah", "alma", "leo", "olivia", "lucas",
  "joão", "pedro", "carlos", "lucia", "ingrid", "björn", "karl", "stina",
]);

/** Padrões gramaticais válidos (sueco) */
const SWEDISH_VALID_PATTERNS = [
  ["PRON", "VERB_INTRANS"],
  ["POSS", "NOUN"],
  ["PRON", "VERB_NAME", "PROPN"],
  ["POSS", "NOUN", "VERB_INTRANS"],
  ["POSS", "NOUN", "VERB_NAME", "PROPN"],
  ["ADV", "VERB_INTRANS", "PRON"],
  ["ADV", "VERB_COPULA", "PRON"],
  ["VERB_INTRANS", "PRON"],
  ["INTJ"],
  ["PRON", "VERB_COPULA", "ADJ"],
  ["POSS", "NOUN", "VERB_COPULA", "ADJ"],
  ["DET", "VERB_COPULA", "ADJ"],
  ["DET", "VERB_COPULA", "NOUN"],
  ["VERB_COPULA", "PRON", "ADJ"],
  ["VERB_COPULA", "DET", "ADJ"],
  ["PRON", "VERB_INTRANS", "CONJ", "PRON", "VERB_INTRANS"],
];

/** Combinações adjacentes proibidas */
const SWEDISH_INVALID_PAIRS: [string, string][] = [
  ["POSS", "VERB_INTRANS"],
  ["POSS", "VERB_NAME"],
  ["POSS", "ADV"],
  ["POSS", "INTJ"],
  ["POSS", "ADJ"],
  ["POSS", "CONJ"],
  ["POSS", "DET"],
  ["POSS", "ADP"],
  ["ADP", "VERB_INTRANS"],
  ["ADP", "VERB_NAME"],
  ["ADJ", "VERB_INTRANS"],
  ["ADJ", "VERB_NAME"],
  ["CONJ", "VERB_INTRANS"],
  ["CONJ", "VERB_NAME"],
  ["NOUN", "NOUN"],
  ["NOUN", "POSS"],
  ["NOUN", "ADJ"],
  ["ADV", "INTJ"],
  ["VERB_INTRANS", "VERB_INTRANS"],
  ["VERB_INTRANS", "VERB_NAME"],
  ["VERB_NAME", "VERB_INTRANS"],
  ["VERB_NAME", "NOUN"],
  ["PRON", "POSS"],
  ["INTJ", "VERB_INTRANS"],
  ["INTJ", "VERB_NAME"],
  ["INTJ", "VERB_COPULA"],
];

function getSwedishCategory(
  word: string,
  userWords: Set<string>,
  wordToTranslation?: Map<string, string>,
  wordToType?: Map<string, string>
): string {
  const lower = word.toLowerCase();
  if (SWEDISH_LEXICON[lower]) return SWEDISH_LEXICON[lower];
  if (wordToType?.has(lower)) return wordToType.get(lower)!;
  if (SWEDISH_PROPER_NAMES.has(lower)) return "PROPN";
  if (wordToTranslation) {
    const trans = wordToTranslation.get(lower);
    if (trans && trans.trim().toLowerCase() === lower) return "PROPN";
  }
  if (userWords.has(lower)) return "NOUN";
  return "UNKNOWN";
}

/** Valida se a frase em sueco segue a gramática (padrões A-E) */
export function validateSwedishGrammar(
  sentenceTarget: string,
  userWords: { word: string; translation?: string; wordType?: string | null }[]
): { valid: boolean; reason?: string } {
  const tokens = extractWordsFromSentence(sentenceTarget);
  if (tokens.length === 0) return { valid: false, reason: "frase vazia" };
  const userSet = new Set(userWords.map((w) => w.word.toLowerCase()));
  const wordToTrans = new Map(userWords.map((w) => [w.word.toLowerCase(), w.translation ?? ""]));
  const wordToType = new Map(
    userWords.filter((w) => w.wordType).map((w) => [w.word.toLowerCase(), w.wordType!])
  );
  const categories = tokens.map((t) => getSwedishCategory(t, userSet, wordToTrans, wordToType));
  if (categories.some((c) => c === "UNKNOWN")) return { valid: false, reason: "palavra sem categoria definida" };

  const heterIdx = categories.indexOf("VERB_NAME");
  if (heterIdx >= 0) {
    if (heterIdx === categories.length - 1) return { valid: false, reason: "heter exige complemento" };
    const complement = categories[heterIdx + 1];
    if (complement === "NOUN") {
      return { valid: false, reason: "heter exige nome próprio (Anna, Erik), não substantivo comum (vän, fru, kvinna)" };
    }
    if (complement !== "PROPN") {
      return { valid: false, reason: "heter exige nome próprio como complemento" };
    }
  }

  if (categories.length === 1) {
    if (categories[0] === "PROPN") return { valid: false, reason: "nome próprio isolado sem contexto" };
    if (categories[0] === "VERB_INTRANS" || categories[0] === "VERB_NAME" || categories[0] === "VERB_COPULA") {
      return { valid: false, reason: "verbo exige sujeito" };
    }
  }

  for (let i = 0; i < categories.length - 1; i++) {
    const pair: [string, string] = [categories[i], categories[i + 1]];
    if (SWEDISH_INVALID_PAIRS.some(([a, b]) => a === pair[0] && b === pair[1])) {
      return { valid: false, reason: `combinação proibida: ${pair[0]} + ${pair[1]}` };
    }
  }

  const matchesPattern = SWEDISH_VALID_PATTERNS.some(
    (pat) => pat.length === categories.length && categories.every((c, i) => c === pat[i])
  );
  if (matchesPattern) return { valid: true };

  if (categories[0] === "VERB_INTRANS" || categories[0] === "VERB_NAME" || categories[0] === "VERB_COPULA") {
    return { valid: false, reason: "verbo exige sujeito (ex: Jag odlar, Är du bra?)" };
  }
  if (categories[0] === "POSS" && categories[1] !== "NOUN") {
    return { valid: false, reason: '"min" precisa de um substantivo após ele' };
  }
  if (categories.includes("NOUN") && categories.indexOf("NOUN") < categories.length - 1) {
    const nextIdx = categories.indexOf("NOUN") + 1;
    if (categories[nextIdx] === "NOUN") {
      return { valid: false, reason: "dois substantivos seguidos sem verbo são inválidos" };
    }
  }
  if (
    categories[0] === "PRON" &&
    categories[1] !== "VERB_INTRANS" &&
    categories[1] !== "VERB_NAME" &&
    categories[1] !== "VERB_COPULA"
  ) {
    return { valid: false, reason: "verbo obrigatório após pronome (ex: Jag är, Jag odlar)" };
  }
  if (categories[0] === "NOUN" && categories[1] === "POSS") {
    return { valid: false, reason: "possessivo deve vir antes do substantivo" };
  }
  return { valid: false, reason: "estrutura gramatical inválida" };
}

/** Verifica se todas as palavras da frase estão no vocabulário do usuário (case-insensitive) */
export function validatePhraseUsesOnlyVocabulary(
  sentenceTarget: string,
  userWords: { word: string }[]
): { valid: boolean; unknownWords: string[] } {
  const allowed = new Set(userWords.map((w) => w.word.toLowerCase().trim()));
  const wordsInSentence = extractWordsFromSentence(sentenceTarget);
  const unknown: string[] = [];
  for (const w of wordsInSentence) {
    const lower = w.toLowerCase();
    if (!allowed.has(lower)) {
      unknown.push(w);
    }
  }
  return { valid: unknown.length === 0, unknownWords: unknown };
}

export async function generatePhrase(
  targetLanguage: string,
  nativeLanguage: string,
  words: { word: string; translation: string }[],
  options?: { excludePhrases?: string[] }
): Promise<PhraseResult | null> {
  const maxAttempts = 5;
  let currentOptions = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const prompt = buildPrompt(targetLanguage, nativeLanguage, words, currentOptions);
    const result = GROQ_API_KEY ? await generateWithGroq(prompt) : await generateWithOllama(prompt);
    if (!result) {
      console.warn(`[generatePhrase] attempt ${attempt}: API retornou null (${getLLMProvider()})`);
      continue;
    }

    const { valid, unknownWords } = validatePhraseUsesOnlyVocabulary(result.sentenceTarget, words);
    if (!valid) {
      console.warn(`[generatePhrase] attempt ${attempt}: palavras inválidas: ${unknownWords.join(", ")}`);
      currentOptions = {
        ...currentOptions,
        excludePhrases: [...(currentOptions?.excludePhrases ?? []), result.sentenceTarget],
      };
      continue;
    }

    const lang = targetLanguage.toLowerCase();
    const isSwedish = lang.includes("svensk") || lang.includes("sueco") || lang.includes("swedish") || lang === "sv";
    if (isSwedish) {
      const spacyResult = await validateWithSpacy(result.sentenceTarget);
      const grammar = spacyResult
        ? { valid: spacyResult.valid, reason: spacyResult.reason }
        : validateSwedishGrammar(result.sentenceTarget, words);
      if (!grammar.valid) {
        console.warn(`[generatePhrase] attempt ${attempt}: gramática inválida: ${grammar.reason}${spacyResult ? " (spaCy)" : " (manual)"}`);
        currentOptions = {
          ...currentOptions,
          excludePhrases: [...(currentOptions?.excludePhrases ?? []), result.sentenceTarget],
        };
        continue;
      }
    }
    return result;
  }
  console.warn(`[generatePhrase] falhou após ${maxAttempts} tentativas (${getLLMProvider()}), usando fallback`);
  return generateFallbackPhrase(targetLanguage, nativeLanguage, words, options?.excludePhrases ?? []);
}

/** Classifica palavras por papel gramatical (sueco) */
function classifyWords(words: { word: string; translation: string }[]): {
  subjects: { word: string; translation: string }[];
  possessives: { word: string; translation: string }[];
  verbs: { word: string; translation: string }[];
  copula: { word: string; translation: string }[];
  nouns: { word: string; translation: string }[];
  properNames: { word: string; translation: string }[];
  adverbs: { word: string; translation: string }[];
  adjectives: { word: string; translation: string }[];
  determiners: { word: string; translation: string }[];
  interjections: { word: string; translation: string }[];
} {
  const SUBJECTS = new Set(["jag", "du", "han", "hon", "vi", "de"]);
  const POSSESSIVES = new Set(["min", "mitt", "mina", "din", "ditt", "dina"]);
  const VERBS = new Set(["heter", "odlar", "mår", "har", "går", "kommer"]);
  const COPULA = new Set(["är", "var", "bli", "blir"]);
  const ADVERBS = new Set(["hur", "var", "när", "varför", "vad"]);
  const ADJECTIVES = new Set(["bra", "god", "dålig", "stor", "liten", "fin", "vacker"]);
  const DETERMINERS = new Set(["det", "den", "detta", "denna"]);
  const INTERJECTIONS = new Set(["hej", "tack", "nej", "ja"]);
  const subjects: { word: string; translation: string }[] = [];
  const possessives: { word: string; translation: string }[] = [];
  const verbs: { word: string; translation: string }[] = [];
  const copula: { word: string; translation: string }[] = [];
  const nouns: { word: string; translation: string }[] = [];
  const properNames: { word: string; translation: string }[] = [];
  const adverbs: { word: string; translation: string }[] = [];
  const adjectives: { word: string; translation: string }[] = [];
  const determiners: { word: string; translation: string }[] = [];
  const interjections: { word: string; translation: string }[] = [];
  for (const w of words) {
    const lower = w.word.toLowerCase();
    const transLower = w.translation?.trim().toLowerCase() ?? "";
    const isLikelyName = transLower === lower || SWEDISH_PROPER_NAMES.has(lower);
    const isAdjFromLexicon = SWEDISH_LEXICON[lower] === "ADJ";
    if (SUBJECTS.has(lower)) subjects.push(w);
    else if (POSSESSIVES.has(lower)) possessives.push(w);
    else if (COPULA.has(lower)) copula.push(w);
    else if (VERBS.has(lower)) verbs.push(w);
    else if (ADVERBS.has(lower)) adverbs.push(w);
    else if (ADJECTIVES.has(lower) || isAdjFromLexicon) adjectives.push(w);
    else if (DETERMINERS.has(lower)) determiners.push(w);
    else if (INTERJECTIONS.has(lower)) interjections.push(w);
    else if (isLikelyName) properNames.push(w);
    else nouns.push(w);
  }
  return { subjects, possessives, verbs, copula, nouns, properNames, adverbs, adjectives, determiners, interjections };
}

/** Fallback: usa templates gramaticais quando o LLM falha */
async function generateFallbackPhrase(
  targetLanguage: string,
  nativeLanguage: string,
  words: { word: string; translation: string }[],
  excludePhrases: string[]
): Promise<PhraseResult | null> {
  const lang = targetLanguage.toLowerCase();
  const isSwedish = lang.includes("svensk") || lang.includes("sueco") || lang.includes("swedish") || lang === "sv";
  if (!isSwedish || words.length < 2) {
    return generateRandomPairFallback(targetLanguage, nativeLanguage, words, excludePhrases);
  }

  const { subjects, possessives, verbs, copula, nouns, properNames, adverbs, adjectives, determiners } =
    classifyWords(words);
  const excludeSet = new Set(excludePhrases.map((p) => p.toLowerCase()));
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const candidates: { sentenceTarget: string; wordsUsed: { word: string; translation: string }[] }[] = [];

  if (possessives.length > 0 && nouns.length > 0) {
    for (const p of possessives) {
      for (const n of nouns) {
        const sent = `${cap(p.word)} ${n.word}`;
        if (!excludeSet.has(sent.toLowerCase())) candidates.push({ sentenceTarget: sent, wordsUsed: [p, n] });
      }
    }
  }

  if (subjects.length > 0 && verbs.length > 0) {
    const subj = subjects[0];
    for (const v of verbs) {
      if (v.word.toLowerCase() === "heter" && properNames.length > 0) {
        for (const pn of properNames) {
          const sent = `${cap(subj.word)} ${v.word} ${pn.word}`;
          if (!excludeSet.has(sent.toLowerCase())) candidates.push({ sentenceTarget: sent, wordsUsed: [subj, v, pn] });
        }
      } else if (v.word.toLowerCase() === "odlar") {
        const sent = `${cap(subj.word)} ${v.word}`;
        if (!excludeSet.has(sent.toLowerCase())) candidates.push({ sentenceTarget: sent, wordsUsed: [subj, v] });
      }
    }
  }

  if (adverbs.length > 0 && verbs.length > 0 && subjects.length > 0) {
    const adv = adverbs.find((a) => a.word.toLowerCase() === "hur");
    const v = verbs.find((v) => v.word.toLowerCase() === "mår");
    const subj = subjects.find((s) => s.word.toLowerCase() === "du");
    if (adv && v && subj) {
      const sent = `${cap(adv.word)} ${v.word} ${subj.word}`;
      if (!excludeSet.has(sent.toLowerCase())) candidates.push({ sentenceTarget: sent, wordsUsed: [adv, v, subj] });
    }
  }

  if (verbs.length > 0 && subjects.length > 0) {
    const v = verbs.find((v) => v.word.toLowerCase() === "mår");
    const subj = subjects.find((s) => s.word.toLowerCase() === "du");
    if (v && subj) {
      const sent = `${cap(v.word)} ${subj.word}`;
      if (!excludeSet.has(sent.toLowerCase())) candidates.push({ sentenceTarget: sent, wordsUsed: [v, subj] });
    }
  }

  if (subjects.length > 0 && copula.length > 0 && adjectives.length > 0) {
    const subj = subjects[0];
    const cop = copula[0];
    const adj = adjectives[0];
    const sent = `${cap(subj.word)} ${cop.word} ${adj.word}`;
    if (!excludeSet.has(sent.toLowerCase())) candidates.push({ sentenceTarget: sent, wordsUsed: [subj, cop, adj] });
  }

  if (determiners.length > 0 && copula.length > 0 && adjectives.length > 0) {
    const det = determiners[0];
    const cop = copula[0];
    const adj = adjectives[0];
    const sent = `${cap(det.word)} ${cop.word} ${adj.word}`;
    if (!excludeSet.has(sent.toLowerCase())) candidates.push({ sentenceTarget: sent, wordsUsed: [det, cop, adj] });
  }

  if (possessives.length > 0 && nouns.length > 0 && copula.length > 0 && adjectives.length > 0) {
    const p = possessives[0];
    const n = nouns[0];
    const cop = copula[0];
    const adj = adjectives[0];
    const sent = `${cap(p.word)} ${n.word} ${cop.word} ${adj.word}`;
    if (!excludeSet.has(sent.toLowerCase())) candidates.push({ sentenceTarget: sent, wordsUsed: [p, n, cop, adj] });
  }

  if (possessives.length > 0 && nouns.length > 0 && verbs.length > 0) {
    for (const p of possessives) {
      for (const n of nouns) {
        for (const v of verbs) {
          if (v.word.toLowerCase() === "odlar") {
            const sent = `${cap(p.word)} ${n.word} ${v.word}`;
            if (!excludeSet.has(sent.toLowerCase())) candidates.push({ sentenceTarget: sent, wordsUsed: [p, n, v] });
          } else if (v.word.toLowerCase() === "heter" && properNames.length > 0) {
            for (const pn of properNames) {
              const sent = `${cap(p.word)} ${n.word} ${v.word} ${pn.word}`;
              if (!excludeSet.has(sent.toLowerCase())) candidates.push({ sentenceTarget: sent, wordsUsed: [p, n, v, pn] });
            }
          }
        }
      }
    }
  }

  const shuffled = candidates.sort(() => Math.random() - 0.5);
  for (const c of shuffled) {
    const sentenceNative = await translateSimple(
      c.sentenceTarget,
      targetLanguage,
      nativeLanguage,
      c.wordsUsed
    );
    if (sentenceNative) {
      return {
        sentenceTarget: c.sentenceTarget,
        sentenceNative,
        wordsUsed: c.wordsUsed.map((w) => w.word),
      };
    }
  }

  return generateRandomPairFallback(targetLanguage, nativeLanguage, words, excludePhrases);
}

/** Fallback secundário: pares aleatórios (apenas estruturas válidas para sueco) */
async function generateRandomPairFallback(
  targetLanguage: string,
  nativeLanguage: string,
  words: { word: string; translation: string }[],
  excludePhrases: string[]
): Promise<PhraseResult | null> {
  if (words.length < 2) return null;
  const lang = targetLanguage.toLowerCase();
  const isSwedish = lang.includes("svensk") || lang.includes("sueco") || lang.includes("swedish") || lang === "sv";

  const shuffled = [...words].sort(() => Math.random() - 0.5);
  for (let i = 0; i < shuffled.length; i++) {
    for (let j = 0; j < shuffled.length; j++) {
      if (i === j) continue;
      const w1 = shuffled[i];
      const w2 = shuffled[j];
      const sentenceTarget = w1.word.charAt(0).toUpperCase() + w1.word.slice(1).toLowerCase() + " " + w2.word.toLowerCase();
      if (excludePhrases.some((p) => p.toLowerCase() === sentenceTarget.toLowerCase())) continue;

      if (isSwedish) {
        const grammar = validateSwedishGrammar(sentenceTarget, words);
        if (!grammar.valid) continue;
      }

      const sentenceNative = await translateSimple(sentenceTarget, targetLanguage, nativeLanguage, [w1, w2]);
      if (sentenceNative) {
        return { sentenceTarget, sentenceNative, wordsUsed: [w1.word, w2.word] };
      }
    }
  }
  return null;
}

async function translateSimple(
  sentence: string,
  fromLang: string,
  toLang: string,
  wordsUsed?: { word: string; translation: string }[]
): Promise<string | null> {
  const context =
    wordsUsed && wordsUsed.length > 0
      ? `\nContexto (significados corretos): ${wordsUsed.map((w) => `"${w.word}" = ${w.translation}`).join(", ")}\n`
      : "";
  const heterNote =
    sentence.toLowerCase().includes("heter") && wordsUsed && wordsUsed.some((w) => w.word.toLowerCase() === "heter")
      ? "\nImportante: 'heter' = chamar-se. A estrutura é [sujeito] heter [nome]. Traduza como '[sujeito] se chama [nome]', com o complemento como nome próprio (ex: Meu amigo se chama Esposa).\n"
      : "";
  const prompt = `Traduza esta frase de ${fromLang} para ${toLang}. Use os significados corretos das palavras.${context}${heterNote}\nFrase: "${sentence}"\n\nResponda APENAS com a tradução em ${toLang}, nada mais.`;
  try {
    if (GROQ_API_KEY) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          max_tokens: 100,
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
      return raw.replace(/^["']|["']$/g, "").trim() || raw;
    }
    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: { temperature: 0 },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { response?: string };
    return data.response?.trim() ?? null;
  } catch {
    return null;
  }
}

async function generateWithGroq(prompt: string): Promise<PhraseResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error("Groq error:", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!raw) return null;

    return parsePhraseResponse(raw);
  } catch (e) {
    console.error("Groq generatePhrase error:", e);
    return null;
  }
}

async function generateWithOllama(prompt: string): Promise<PhraseResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        format: "json",
        options: { temperature: 0.3 },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error("Ollama error:", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as { response?: string };
    const raw = data.response?.trim() ?? "";
    if (!raw) return null;

    return parsePhraseResponse(raw);
  } catch (e) {
    console.error("Ollama generatePhrase error:", e);
    return null;
  }
}

export interface ExtractedWord {
  word: string;
  translation: string;
  tip?: string;
}

export async function extractWordsFromPhrase(
  phrase: string,
  targetLanguage: string,
  nativeLanguage: string
): Promise<ExtractedWord[] | null> {
  const prompt = `Você é professor de ${targetLanguage}. O aluno fala ${nativeLanguage}.

Frase em ${targetLanguage}: "${phrase}"

Extraia cada palavra ou expressão idiomática significativa da frase e forneça a tradução em ${nativeLanguage}.
Ignore artigos isolados (a, o, um) a menos que sejam parte de expressão.
Opcional: para cada palavra, adicione "tip" com dica gramatical, uso ou exemplo curto.
Retorne APENAS JSON válido, sem markdown:
{"words":[{"word":"palavra1","translation":"tradução1","tip":"dica opcional"},{"word":"palavra2","translation":"tradução2"}]}`;

  const callLLM = async (p: string): Promise<string | null> => {
    if (GROQ_API_KEY) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: p }],
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return data.choices?.[0]?.message?.content?.trim() ?? null;
    }
    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt: p, stream: false, format: "json" }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { response?: string };
    return data.response?.trim() ?? null;
  };

  try {
    const raw = await callLLM(prompt);
    if (!raw) return null;
    let jsonStr = raw;
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1].trim();
    const parsed = JSON.parse(jsonStr) as { words?: ExtractedWord[] };
    if (!Array.isArray(parsed.words) || parsed.words.length === 0) return null;
    return parsed.words.filter((w) => w.word && w.translation);
  } catch {
    return null;
  }
}

export async function checkOllamaHealth(): Promise<boolean> {
  if (GROQ_API_KEY) return true;
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
