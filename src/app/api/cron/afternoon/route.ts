import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMessage } from "@/lib/telegram";
import { generatePhrase } from "@/lib/llm";
import { getMessage } from "@/lib/messages";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  if (CRON_SECRET && request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { words: { some: {} } },
    include: { words: true },
  });

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let sent = 0;
  for (const user of users) {
    const phrasesToday = await prisma.phraseSent.findMany({
      where: { userId: user.id, sentAt: { gte: startOfDay } },
    });
    const excludePhrases = [...new Set(phrasesToday.map((p: { sentenceTarget: string }) => p.sentenceTarget))];

    const result = await generatePhrase(
      user.targetLanguage,
      user.nativeLanguage,
      user.words.map((w: { word: string; translation: string; wordType?: string | null }) => ({
        word: w.word,
        translation: w.translation,
        wordType: w.wordType,
      })),
      excludePhrases.length > 0 ? { excludePhrases } : undefined
    );
    if (result) {
      const greeting = getMessage(user.nativeLanguage, "goodAfternoon");
      const body = `${greeting}\n\n📝 ${result.sentenceTarget}\n🇧🇷 ${result.sentenceNative}\n\n📚 ${result.wordsUsed.join(", ")}${result.tip ? `\n\n💡 ${result.tip}` : ""}`;
      const ok = await sendMessage(user.telegramId, body);
      if (ok) {
        sent++;
        await prisma.phraseSent.create({
          data: { userId: user.id, sentenceTarget: result.sentenceTarget },
        });
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
