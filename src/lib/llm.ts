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
  if (lang.includes("svensk") || lang.includes("sueco") || lang === "sv") {
    return "heter e odlar exigem sujeito explícito (jag ou min+substantivo). min exige substantivo depois (min vän, min fru). Forme frases com sujeito+verbo ou sujeito+verbo+complemento. Ex: Jag heter vän, Min fru odlar.";
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
    if (valid) return result;

    console.warn(`[generatePhrase] attempt ${attempt}: palavras inválidas: ${unknownWords.join(", ")}`);
    currentOptions = {
      ...currentOptions,
      excludePhrases: [...(currentOptions?.excludePhrases ?? []), result.sentenceTarget],
    };
  }
  console.warn(`[generatePhrase] falhou após ${maxAttempts} tentativas (${getLLMProvider()}), usando fallback`);
  return generateFallbackPhrase(targetLanguage, nativeLanguage, words, options?.excludePhrases ?? []);
}

/** Classifica palavras por papel gramatical (sueco) */
function classifyWords(words: { word: string; translation: string }[]): {
  subjects: { word: string; translation: string }[];
  possessives: { word: string; translation: string }[];
  verbs: { word: string; translation: string }[];
  nouns: { word: string; translation: string }[];
} {
  const SUBJECTS = new Set(["jag", "du", "han", "hon", "vi", "de"]);
  const POSSESSIVES = new Set(["min", "mitt", "mina", "din", "ditt", "dina"]);
  const VERBS = new Set(["heter", "odlar", "är", "har", "går", "kommer"]);
  const subjects: { word: string; translation: string }[] = [];
  const possessives: { word: string; translation: string }[] = [];
  const verbs: { word: string; translation: string }[] = [];
  const nouns: { word: string; translation: string }[] = [];
  for (const w of words) {
    const lower = w.word.toLowerCase();
    if (SUBJECTS.has(lower)) subjects.push(w);
    else if (POSSESSIVES.has(lower)) possessives.push(w);
    else if (VERBS.has(lower)) verbs.push(w);
    else nouns.push(w);
  }
  return { subjects, possessives, verbs, nouns };
}

/** Fallback: usa templates gramaticais quando o LLM falha */
async function generateFallbackPhrase(
  targetLanguage: string,
  nativeLanguage: string,
  words: { word: string; translation: string }[],
  excludePhrases: string[]
): Promise<PhraseResult | null> {
  const lang = targetLanguage.toLowerCase();
  const isSwedish = lang.includes("svensk") || lang.includes("sueco") || lang === "sv";
  if (!isSwedish || words.length < 2) {
    return generateRandomPairFallback(targetLanguage, nativeLanguage, words, excludePhrases);
  }

  const { subjects, possessives, verbs, nouns } = classifyWords(words);
  const excludeSet = new Set(excludePhrases.map((p) => p.toLowerCase()));
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const candidates: { sentenceTarget: string; wordsUsed: { word: string; translation: string }[] }[] = [];

  if (subjects.length > 0 && verbs.length > 0) {
    const subj = subjects[0];
    for (const v of verbs) {
      if (v.word.toLowerCase() === "heter" && nouns.length > 0) {
        for (const n of nouns) {
          const sent = `${cap(subj.word)} ${v.word} ${n.word}`;
          if (!excludeSet.has(sent.toLowerCase())) candidates.push({ sentenceTarget: sent, wordsUsed: [subj, v, n] });
        }
      } else if (v.word.toLowerCase() === "odlar") {
        const sent = `${cap(subj.word)} ${v.word}`;
        if (!excludeSet.has(sent.toLowerCase())) candidates.push({ sentenceTarget: sent, wordsUsed: [subj, v] });
      }
    }
  }

  if (possessives.length > 0 && nouns.length > 0 && verbs.length > 0) {
    for (const p of possessives) {
      for (const n of nouns) {
        for (const v of verbs) {
          if (v.word.toLowerCase() === "odlar") {
            const sent = `${cap(p.word)} ${n.word} ${v.word}`;
            if (!excludeSet.has(sent.toLowerCase())) candidates.push({ sentenceTarget: sent, wordsUsed: [p, n, v] });
          } else if (v.word.toLowerCase() === "heter" && nouns.length > 1) {
            for (const n2 of nouns) {
              if (n2.word !== n.word) {
                const sent = `${cap(p.word)} ${n.word} ${v.word} ${n2.word}`;
                if (!excludeSet.has(sent.toLowerCase())) candidates.push({ sentenceTarget: sent, wordsUsed: [p, n, v, n2] });
              }
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

/** Fallback secundário: pares aleatórios (para idiomas sem templates) */
async function generateRandomPairFallback(
  targetLanguage: string,
  nativeLanguage: string,
  words: { word: string; translation: string }[],
  excludePhrases: string[]
): Promise<PhraseResult | null> {
  if (words.length < 2) return null;
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  for (let i = 0; i < shuffled.length; i++) {
    for (let j = 0; j < shuffled.length; j++) {
      if (i === j) continue;
      const w1 = shuffled[i];
      const w2 = shuffled[j];
      const sentenceTarget = w1.word.charAt(0).toUpperCase() + w1.word.slice(1).toLowerCase() + " " + w2.word.toLowerCase();
      if (excludePhrases.some((p) => p.toLowerCase() === sentenceTarget.toLowerCase())) continue;
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
  const prompt = `Traduza esta frase de ${fromLang} para ${toLang}. Use os significados corretos das palavras.${context}\nFrase: "${sentence}"\n\nResponda APENAS com a tradução em ${toLang}, nada mais.`;
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
