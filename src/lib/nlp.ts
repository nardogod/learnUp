/**
 * Cliente para o serviço NLP (spaCy + modelo sueco KBLab)
 * Fallback para regras manuais quando API não disponível
 */

const NLP_API_URL = process.env.NLP_API_URL ?? "";

export interface PosToken {
  text: string;
  pos: string;
  tag: string;
  lemma: string;
  learnup_category: string;
}

export interface ValidateResult {
  valid: boolean;
  reason?: string;
  tokens?: PosToken[];
}

export interface CategorizeResult {
  word: string;
  category: string;
  lemma?: string;
}

/** Verifica se o serviço NLP está configurado e acessível */
export async function isNlpAvailable(): Promise<boolean> {
  if (!NLP_API_URL) return false;
  try {
    const res = await fetch(`${NLP_API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    const data = (await res.json()) as { ok?: boolean; model_loaded?: boolean };
    return res.ok && data.model_loaded === true;
  } catch {
    return false;
  }
}

/** Valida frase em sueco via spaCy */
export async function validateWithSpacy(sentence: string): Promise<ValidateResult | null> {
  if (!NLP_API_URL) return null;
  try {
    const res = await fetch(`${NLP_API_URL}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as ValidateResult;
  } catch {
    return null;
  }
}

/** Auto-categoriza palavra via spaCy */
export async function categorizeWithSpacy(word: string): Promise<CategorizeResult | null> {
  if (!NLP_API_URL) return null;
  try {
    const res = await fetch(`${NLP_API_URL}/categorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return (await res.json()) as CategorizeResult;
  } catch {
    return null;
  }
}
