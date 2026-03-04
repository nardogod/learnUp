const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:0.5b";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";

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
  return `Você é professor de ${targetLanguage}. O aluno fala ${nativeLanguage}.

Palavras disponíveis (tradução pode ser curta ou explicação longa - use o contexto completo):
${wordsList}
${excludeNote}

Gere:
1) Uma frase natural em ${targetLanguage} (3-6 palavras) usando algumas dessas palavras
2) Tradução em ${nativeLanguage}
3) Lista das palavras usadas

Responda APENAS em JSON válido, sem markdown, sem explicações:
{"sentenceTarget":"...","sentenceNative":"...","wordsUsed":["..."]}
Opcional: adicione "tip" com dica gramatical ou cultural.`;
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

export async function generatePhrase(
  targetLanguage: string,
  nativeLanguage: string,
  words: { word: string; translation: string }[],
  options?: { excludePhrases?: string[] }
): Promise<PhraseResult | null> {
  const prompt = buildPrompt(targetLanguage, nativeLanguage, words, options);

  if (GROQ_API_KEY) {
    return generateWithGroq(prompt);
  }
  return generateWithOllama(prompt);
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
        temperature: 0.7,
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

export async function checkOllamaHealth(): Promise<boolean> {
  if (GROQ_API_KEY) return true;
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
