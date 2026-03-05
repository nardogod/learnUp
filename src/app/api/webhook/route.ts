import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMessage, validateWebhookSecret } from "@/lib/telegram";
import { getMessage } from "@/lib/messages";
import { handleMessage } from "@/lib/states";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, message: "Webhook ativo. Use POST." });
}

export async function POST(request: NextRequest) {
  if (!validateWebhookSecret(request)) {
    console.warn("[webhook] Rejeitado: secret inválido");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = (body as { message?: { from?: { id: number }; chat?: { id: number }; text?: string } })
    ?.message;
  if (!msg?.from?.id || !msg?.chat?.id || !msg.text) {
    if (msg) console.log("[webhook] Ignorado: sem text (pode ser foto/sticker)");
    return NextResponse.json({ ok: true });
  }

  const chatId = String(msg.chat.id);
  const telegramId = String(msg.from.id);
  const text = msg.text.trim();
  console.log(`[webhook] Mensagem de ${telegramId}: "${text.slice(0, 50)}${text.length > 50 ? "..." : ""}"`);

  // Responde imediatamente ao Telegram (evita timeout de 60s com Ollama lento)
  void (async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { telegramId },
        include: { words: true },
      });

      if (!user) {
        await sendMessage(chatId, getMessage("inglês", "notRegistered"));
        return;
      }

      if (!user.welcomedAt) {
        await sendMessage(chatId, getMessage(user.nativeLanguage, "welcome"));
        await prisma.user.update({
          where: { id: user.id },
          data: { welcomedAt: new Date() },
        });
      }

      await handleMessage(user, text, chatId);
    } catch (e) {
      console.error("[webhook] Erro ao processar:", e);
      await sendMessage(chatId, getMessage("português", "tryAgain"));
    }
  })();

  return NextResponse.json({ ok: true });
}
