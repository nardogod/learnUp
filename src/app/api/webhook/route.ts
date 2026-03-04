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
    return NextResponse.json({ ok: true });
  }

  const chatId = String(msg.chat.id);
  const telegramId = String(msg.from.id);
  const text = msg.text.trim();

  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { words: true },
  });

  if (!user) {
    await sendMessage(chatId, getMessage("inglês", "notRegistered"));
    return NextResponse.json({ ok: true });
  }

  // Boas-vindas na primeira conversa
  if (!user.welcomedAt) {
    await sendMessage(chatId, getMessage(user.nativeLanguage, "welcome"));
    await prisma.user.update({
      where: { id: user.id },
      data: { welcomedAt: new Date() },
    });
  }

  await handleMessage(user, text, chatId);
  return NextResponse.json({ ok: true });
}
