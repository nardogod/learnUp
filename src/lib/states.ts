import type { User } from "@prisma/client";
import { prisma } from "./db";
import { getMessage } from "./messages";
import { sendMessage } from "./telegram";
import { canAddWord, canUseManualFrase } from "./limits";
import { generatePhrase } from "./llm";

const FRASE_TRIGGERS = ["gerar frase", "generate phrase", "generera mening", "frase", "me dá uma frase", "give me a sentence", "ge mig en mening"];

function isAddWordCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === "/addword" || t === "/novapalavra" || t === "/newword" || t === "/nyttord";
}

function isFraseTrigger(text: string): boolean {
  const t = text.toLowerCase().trim();
  return t === "/frase" || FRASE_TRIGGERS.some((w) => t.includes(w));
}

function isCancelTrigger(text: string): boolean {
  return text.trim().toLowerCase() === "/cancel";
}

export async function handleMessage(user: User, text: string, chatId: string): Promise<void> {
  const state = user.conversationState ?? "idle";

  // /start - cancela fluxo e mostra boas-vindas
  if (text.trim() === "/start") {
    await prisma.user.update({
      where: { id: user.id },
      data: { conversationState: "idle", tempWord: null },
    });
    await sendMessage(chatId, getMessage(user.nativeLanguage, "welcome"));
    return;
  }

  // /cancel em qualquer estado
  if (isCancelTrigger(text)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { conversationState: "idle", tempWord: null },
    });
    await sendMessage(chatId, getMessage(user.nativeLanguage, "cancel"));
    return;
  }

  // /plan
  if (text.trim() === "/plan") {
    if (user.plan === "premium") {
      const msg = getMessage(user.nativeLanguage, "planPremium", {
        count: String(user.phrasesPerDay ?? 3),
      });
      await sendMessage(chatId, msg);
    } else {
      await sendMessage(chatId, getMessage(user.nativeLanguage, "planFree"));
    }
    return;
  }

  // /palavras
  if (text.trim() === "/palavras") {
    const words = await prisma.word.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    if (words.length === 0) {
      await sendMessage(chatId, getMessage(user.nativeLanguage, "noWords"));
      return;
    }
    const list = words.map((w) => `• ${w.word} = ${w.translation}`).join("\n");
    await sendMessage(chatId, `📚 Suas palavras (${words.length}):\n\n${list}`);
    return;
  }

  // /ranking
  if (text.trim() === "/ranking") {
    const top = await prisma.user.findMany({
      where: { words: { some: {} } },
      include: { _count: { select: { words: true } } },
      orderBy: { words: { _count: "desc" } },
      take: 3,
    });
    const names = top.map((u) => u.name || u.firstName || u.username || "Anônimo");
    const counts = top.map((u) => u._count.words);
    const msg = getMessage(user.nativeLanguage, "ranking", {
      name1: names[0] ?? "-",
      count1: String(counts[0] ?? 0),
      name2: names[1] ?? "-",
      count2: String(counts[1] ?? 0),
      name3: names[2] ?? "-",
      count3: String(counts[2] ?? 0),
    });
    await sendMessage(chatId, msg);
    return;
  }

  // /frase ou "gerar frase"
  if (isFraseTrigger(text)) {
    const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!freshUser) return;
    if (!canUseManualFrase(freshUser)) {
      await sendMessage(chatId, getMessage(user.nativeLanguage, "fraseLimitReached"));
      return;
    }
    const words = await prisma.word.findMany({ where: { userId: user.id } });
    if (words.length === 0) {
      await sendMessage(chatId, getMessage(user.nativeLanguage, "noWords"));
      return;
    }

    const today = new Date();
    const todayStr = today.toDateString();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const phrasesToday = await prisma.phraseSent.findMany({
      where: { userId: user.id, sentAt: { gte: startOfDay } },
    });

    const countByPhrase = new Map<string, number>();
    for (const p of phrasesToday) {
      countByPhrase.set(p.sentenceTarget, (countByPhrase.get(p.sentenceTarget) ?? 0) + 1);
    }
    const excludePhrases = Array.from(countByPhrase.entries())
      .filter(([, c]) => c >= 2)
      .map(([s]) => s);

    const minWordsForVariety = 5;
    const maxPhrasesBeforeVariety = Math.max(8, words.length * 3);
    if (words.length < minWordsForVariety && phrasesToday.length >= maxPhrasesBeforeVariety) {
      await sendMessage(chatId, getMessage(user.nativeLanguage, "fewWordsForVariety"));
      return;
    }

    const result = await generatePhrase(
      user.targetLanguage,
      user.nativeLanguage,
      words.map((w) => ({ word: w.word, translation: w.translation })),
      { excludePhrases: excludePhrases.length > 0 ? excludePhrases : undefined }
    );

    if (!result) {
      if (excludePhrases.length > 0 && words.length < 8) {
        await sendMessage(chatId, getMessage(user.nativeLanguage, "fewWordsForVariety"));
      } else {
        await sendMessage(chatId, getMessage(user.nativeLanguage, "tryAgain"));
      }
      return;
    }

    const lastDate = freshUser.lastFraseDate?.toDateString();
    const newCount = lastDate === todayStr ? (freshUser.fraseCountToday ?? 0) + 1 : 1;
    await prisma.user.update({
      where: { id: user.id },
      data: { fraseCountToday: newCount, lastFraseDate: new Date() },
    });
    await prisma.phraseSent.create({
      data: {
        userId: user.id,
        sentenceTarget: result.sentenceTarget,
      },
    });

    let out = `📝 ${result.sentenceTarget}\n🇧🇷 ${result.sentenceNative}\n\n📚 ${result.wordsUsed.join(", ")}`;
    if (result.tip) out += `\n\n💡 ${result.tip}`;
    await sendMessage(chatId, out);
    return;
  }

  // Máquina de estados: cadastro de palavra (só por comando)
  if (state === "idle" && isAddWordCommand(text)) {
    const wordCount = await prisma.word.count({ where: { userId: user.id } });
    if (!canAddWord(user, wordCount)) {
      await sendMessage(chatId, getMessage(user.nativeLanguage, "limitReached"));
      return;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { conversationState: "aguardando_palavra" },
    });
    await sendMessage(chatId, getMessage(user.nativeLanguage, "newWord"));
    return;
  }

  if (state === "aguardando_palavra") {
    const word = text.trim();
    if (!word) return;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        conversationState: "aguardando_significado",
        tempWord: word,
      },
    });
    await sendMessage(chatId, getMessage(user.nativeLanguage, "whatMeans", { word }));
    return;
  }

  if (state === "aguardando_significado") {
    const tempWord = user.tempWord ?? "";
    const translation = text.trim();
    if (!tempWord || !translation) return;
    // Comandos não são traduções
    if (translation.startsWith("/")) {
      await sendMessage(chatId, getMessage(user.nativeLanguage, "whatMeans", { word: tempWord }));
      return;
    }

    const wordCount = await prisma.word.count({ where: { userId: user.id } });
    if (!canAddWord(user, wordCount)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { conversationState: "idle", tempWord: null },
      });
      await sendMessage(chatId, getMessage(user.nativeLanguage, "limitReached"));
      return;
    }

    await prisma.word.create({
      data: {
        userId: user.id,
        word: tempWord,
        translation,
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { conversationState: "idle", tempWord: null },
    });
    const newCount = wordCount + 1;
    const msg = getMessage(user.nativeLanguage, "wordSaved", {
      word: tempWord,
      translation,
    });
    await sendMessage(chatId, `${msg}\n\nVocê tem ${newCount} palavras.`);
    return;
  }

  // idle sem comando reconhecido - ignorar ou ajudar
  if (state === "idle") {
    // Opcional: enviar dica
    return;
  }
}
