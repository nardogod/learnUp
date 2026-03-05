const TELEGRAM_API = "https://api.telegram.org/bot";

export async function sendMessage(
  chatId: string | number,
  text: string,
  options?: { parse_mode?: "HTML" | "Markdown"; reply_markup?: Record<string, unknown> }
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN not set");
    return false;
  };

  const url = `${TELEGRAM_API}${token}/sendMessage`;
  const body = {
    chat_id: chatId,
    text,
    parse_mode: options?.parse_mode ?? undefined,
    reply_markup: options?.reply_markup ?? undefined,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Telegram sendMessage error:", res.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Telegram sendMessage exception:", e);
    return false;
  }
}

export async function setWebhook(url: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN not set");
    return false;
  }

  const apiUrl = `${TELEGRAM_API}${token}/setWebhook`;
  const body: { url: string; secret_token?: string } = { url };
  if (secret) body.secret_token = secret;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Telegram setWebhook error:", res.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Telegram setWebhook exception:", e);
    return false;
  }
}

export async function setMyCommands(): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN not set");
    return false;
  }

  const commands = [
    { command: "start", description: "Iniciar / Welcome" },
    { command: "status", description: "Ver qual LLM está ativo" },
    { command: "addword", description: "Adicionar nova palavra" },
    { command: "addphrase", description: "Extrair palavras de uma frase" },
    { command: "frase", description: "Gerar frase com suas palavras" },
    { command: "palavras", description: "Ver suas palavras" },
    { command: "editword", description: "Trocar significado de palavra" },
    { command: "ranking", description: "Top 3 usuários" },
    { command: "plan", description: "Ver plano e limites" },
    { command: "cancel", description: "Cancelar operação" },
  ];

  try {
    const res = await fetch(`${TELEGRAM_API}${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
    if (!res.ok) {
      console.error("setMyCommands error:", await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("setMyCommands exception:", e);
    return false;
  }
}

export function validateWebhookSecret(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return true; // skip if not configured
  const header = request.headers.get("x-telegram-bot-api-secret-token");
  return header === secret;
}
