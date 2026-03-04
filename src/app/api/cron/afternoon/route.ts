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

  let sent = 0;
  for (const user of users) {
    const result = await generatePhrase(
      user.targetLanguage,
      user.nativeLanguage,
      user.words.map((w) => ({ word: w.word, translation: w.translation }))
    );
    if (result) {
      const greeting = getMessage(user.nativeLanguage, "goodAfternoon");
      const body = `${greeting}\n\n📝 ${result.sentenceTarget}\n🇧🇷 ${result.sentenceNative}\n\n📚 ${result.wordsUsed.join(", ")}${result.tip ? `\n\n💡 ${result.tip}` : ""}`;
      const ok = await sendMessage(user.telegramId, body);
      if (ok) sent++;
    }
  }

  return NextResponse.json({ ok: true, sent });
}
