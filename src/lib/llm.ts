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
  const strictRule = `REGRA CRÍTICA - OBRIGATÓRIO: A frase em ${targetLanguage} deve conter APENAS estas palavras: [${allowedWords}]. NENHUMA outra palavra é permitida. Se precisar, faça frases curtas (ex: 2-3 palavras).`;

  return `Você é professor de ${targetLanguage}. O aluno fala ${nativeLanguage}.

Palavras PERMITIDAS (use SOMENTE estas): [${allowedWords}]
${wordsList}
${excludeNote}

${strictRule}

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

/** Fallback: gera frase simples (2 palavras) quando o LLM falha */
async function generateFallbackPhrase(
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
      const w1 = shuffled[i].word;
      const w2 = shuffled[j].word;
      const sentenceTarget = w1.charAt(0).toUpperCase() + w1.slice(1).toLowerCase() + " " + w2.toLowerCase();
      if (excludePhrases.some((p) => p.toLowerCase() === sentenceTarget.toLowerCase())) continue;

      const sentenceNative = await translateSimple(
        sentenceTarget,
        targetLanguage,
        nativeLanguage,
        [shuffled[i], shuffled[j]]
      );
      if (sentenceNative) {
        return {
          sentenceTarget,
          sentenceNative,
          wordsUsed: [w1, w2],
        };
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
