import type { User } from "@prisma/client";
import { prisma } from "./db";
import { getMessage } from "./messages";
import { sendMessage } from "./telegram";
import { canAddWord, canUseManualFrase, getRemainingFraseCount } from "./limits";
import { generatePhrase, extractWordsFromPhrase, getLLMProvider } from "./llm";
import { findDuplicateWord, deduplicateUserWords } from "./words";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function boldWordsInSentence(sentence: string, wordsUsed: string[]): string {
  const unique = [...new Set(wordsUsed)].filter((w) => w.length > 0).sort((a, b) => b.length - a.length);
  let result = escapeHtml(sentence);
  for (const word of unique) {
    const escaped = escapeHtml(word);
    const regex = new RegExp(`(${escaped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    result = result.replace(regex, "<b>$1</b>");
  }
  return result;
}

const FRASE_TRIGGERS = ["gerar frase", "generate phrase", "generera mening", "frase", "me dá uma frase", "give me a sentence", "ge mig en mening"];

function isAddWordCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === "/addword" || t === "/novapalavra" || t === "/newword" || t === "/nyttord";
}

function isAddPhraseCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === "/addphrase" || t === "/addfrase" || t === "/frase nova" || t.includes("adicionar frase");
}

function isEditWordTrigger(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t === "/editword" ||
    t === "/editpalavra" ||
    t.includes("trocar significado") ||
    t.includes("mudar significado") ||
    t.includes("editar palavra")
  );
}

function isFraseTrigger(text: string): boolean {
  const t = text.toLowerCase().trim();
  return t === "/frase" || FRASE_TRIGGERS.some((w) => t.includes(w));
}

function isCancelTrigger(text: string): boolean {
  const t = text.trim();
  return t === "/cancel" || t.toLowerCase() === "/cancel" || t.toLowerCase().startsWith("/cancel@");
}

/** Comando exato (aceita /cmd ou /cmd@BotName) */
function isCommand(text: string, cmd: string): boolean {
  const t = text.trim();
  return t === cmd || t.startsWith(cmd + "@");
}

export async function handleMessage(user: User, text: string, chatId: string): Promise<void> {
  const state = user.conversationState ?? "idle";

  // /start - cancela fluxo e mostra boas-vindas
  if (isCommand(text, "/start")) {
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

  // /deduplicate - remove duplicatas do vocabulário (palavras)
  if (isCommand(text, "/deduplicate")) {
    const before = await prisma.word.count({ where: { userId: user.id } });
    const removed = await deduplicateUserWords(user.id);
    const after = await prisma.word.count({ where: { userId: user.id } });
    await sendMessage(
      chatId,
      getMessage(user.nativeLanguage, "deduplicateDone", { removed: String(removed), total: String(after) })
    );
    return;
  }

  // /status - debug: qual LLM está ativo
  if (isCommand(text, "/status")) {
    const provider = getLLMProvider();
    const msg = provider === "groq" ? "✅ LLM: Groq" : "⚠️ LLM: Ollama (Groq não configurado)";
    await sendMessage(chatId, msg);
    return;
  }

  // /plan
  if (isCommand(text, "/plan")) {
    if (user.plan === "premium") {
      const msg =
        user.phrasesPerDay == null
          ? getMessage(user.nativeLanguage, "planPremiumUnlimited")
          : getMessage(user.nativeLanguage, "planPremium", { count: String(user.phrasesPerDay) });
      await sendMessage(chatId, msg);
    } else {
      await sendMessage(chatId, getMessage(user.nativeLanguage, "planFree"));
    }
    return;
  }

  // /palavras
  if (isCommand(text, "/palavras")) {
    const [words, totalCount] = await Promise.all([
      prisma.word.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.word.count({ where: { userId: user.id } }),
    ]);
    if (words.length === 0) {
      await sendMessage(chatId, getMessage(user.nativeLanguage, "noWords"));
      return;
    }
    const list = words.map((w) => `• ${w.word} = ${w.translation}`).join("\n");
    const suffix = totalCount > 50 ? `\n\n... e mais ${totalCount - 50} palavras` : "";
    await sendMessage(chatId, `📚 Suas palavras (${totalCount}):\n\n${list}${suffix}`);
    return;
  }

  // /ranking
  if (isCommand(text, "/ranking")) {
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

    // Negrito apenas para palavras do vocabulário do usuário
    const userWordsForBold = words.map((w) => w.word);
    const userTranslationsForBold = words.map((w) => w.translation);
    const sentenceTargetBold = boldWordsInSentence(result.sentenceTarget, userWordsForBold);
    const sentenceNativeBold = boldWordsInSentence(result.sentenceNative, userTranslationsForBold);
    const remaining = getRemainingFraseCount({
      ...freshUser,
      fraseCountToday: newCount,
      lastFraseDate: new Date(),
    });
    const wordCount = words.length;

    const wordsUsedFromVocab = result.wordsUsed.filter((w) =>
      words.some((uw) => uw.word.toLowerCase() === w.toLowerCase())
    );
    let out = `📝 ${sentenceTargetBold}\n🇧🇷 ${sentenceNativeBold}\n\n📚 ${wordsUsedFromVocab.join(", ")}`;
    if (result.tip) out += `\n\n💡 LearnUP: ${result.tip}`;
    const phrasesMsg =
      remaining === Infinity
        ? getMessage(user.nativeLanguage, "phrasesLeftUnlimited", { total: String(wordCount) })
        : getMessage(user.nativeLanguage, "phrasesLeft", { left: String(remaining), total: String(wordCount) });
    out += `\n\n${phrasesMsg}`;
    await sendMessage(chatId, out, { parse_mode: "HTML" });
    return;
  }

  // /addphrase - extrair palavras de uma frase
  if (state === "idle" && isAddPhraseCommand(text)) {
    const wordCount = await prisma.word.count({ where: { userId: user.id } });
    if (!canAddWord(user, wordCount)) {
      await sendMessage(chatId, getMessage(user.nativeLanguage, "limitReached"));
      return;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { conversationState: "aguardando_frase" },
    });
    await sendMessage(
      chatId,
      getMessage(user.nativeLanguage, "addPhrasePrompt", { lang: user.targetLanguage })
    );
    return;
  }

  if (state === "aguardando_frase") {
    const phrase = text.trim();
    if (!phrase || phrase.startsWith("/")) return;
    await prisma.user.update({
      where: { id: user.id },
      data: { conversationState: "idle" },
    });
    const extracted = await extractWordsFromPhrase(phrase, user.targetLanguage, user.nativeLanguage);
    if (!extracted || extracted.length === 0) {
      await sendMessage(chatId, getMessage(user.nativeLanguage, "tryAgain"));
      return;
    }
    let wordCount = await prisma.word.count({ where: { userId: user.id } });
    let saved = 0;
    for (const w of extracted) {
      if (!canAddWord(user, wordCount)) break;
      const dup = await findDuplicateWord(user.id, w.word.trim());
      if (dup.exists) continue;
      await prisma.word.create({
        data: {
          userId: user.id,
          word: w.word.trim(),
          translation: w.translation.trim(),
          description: w.tip?.trim() || null,
        },
      });
      wordCount++;
      saved++;
    }
    const totalCount = await prisma.word.count({ where: { userId: user.id } });
    const msg =
      saved === extracted.length
        ? getMessage(user.nativeLanguage, "phraseWordsSaved", { count: String(saved), total: String(totalCount) })
        : getMessage(user.nativeLanguage, "phraseWordsPartial", { saved: String(saved), total: String(totalCount) });
    await sendMessage(chatId, msg);
    return;
  }

  // trocar significado / editword
  if (state === "idle" && isEditWordTrigger(text)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { conversationState: "aguardando_palavra_editar" },
    });
    await sendMessage(chatId, getMessage(user.nativeLanguage, "editWordPrompt"));
    return;
  }

  if (state === "aguardando_palavra_editar") {
    const wordToEdit = text.trim();
    if (!wordToEdit || wordToEdit.startsWith("/")) return;
    const existing = await prisma.word.findFirst({
      where: { userId: user.id, word: { equals: wordToEdit, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
    });
    if (!existing) {
      await sendMessage(chatId, getMessage(user.nativeLanguage, "editWordNotFound", { word: wordToEdit }));
      await prisma.user.update({
        where: { id: user.id },
        data: { conversationState: "idle" },
      });
      return;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { conversationState: "aguardando_novo_significado", tempWord: existing.id },
    });
    await sendMessage(chatId, getMessage(user.nativeLanguage, "editWordAskNew", { word: existing.word }));
    return;
  }

  if (state === "aguardando_novo_significado") {
    const wordId = user.tempWord ?? "";
    const newTranslation = text.trim();
    if (!wordId || !newTranslation || newTranslation.startsWith("/")) return;
    const word = await prisma.word.findFirst({ where: { id: wordId, userId: user.id } });
    if (!word) {
      await prisma.user.update({ where: { id: user.id }, data: { conversationState: "idle", tempWord: null } });
      return;
    }
    await prisma.word.update({
      where: { id: wordId },
      data: { translation: newTranslation },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { conversationState: "idle", tempWord: null },
    });
    await sendMessage(chatId, getMessage(user.nativeLanguage, "editWordSaved", { word: word.word, translation: newTranslation }));
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

    // Armazena "palavra|||tradução" e pede dica opcional
    await prisma.user.update({
      where: { id: user.id },
      data: {
        conversationState: "aguardando_dica",
        tempWord: `${tempWord}|||${translation}`,
      },
    });
    const skipLabel = getMessage(user.nativeLanguage, "wordTipSkip");
    await sendMessage(chatId, getMessage(user.nativeLanguage, "wordTipPrompt", { word: tempWord }), {
      reply_markup: {
        keyboard: [[skipLabel]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
    return;
  }

  if (state === "aguardando_dica") {
    const stored = user.tempWord ?? "";
    const sep = stored.indexOf("|||");
    if (sep === -1) {
      await prisma.user.update({ where: { id: user.id }, data: { conversationState: "idle", tempWord: null } });
      return;
    }
    const word = stored.slice(0, sep);
    const translation = stored.slice(sep + 3);
    const tip = text.trim();
    const skipLabels = ["pular", "skip", "hoppa över", "hoppa", "pula", "-"];
    const isSkip = skipLabels.includes(tip.toLowerCase());
    const description = !isSkip && tip && !tip.startsWith("/") ? tip : null;

    const dup = await findDuplicateWord(user.id, word);
    if (dup.exists) {
      await prisma.user.update({
        where: { id: user.id },
        data: { conversationState: "idle", tempWord: null },
      });
      await sendMessage(chatId, getMessage(user.nativeLanguage, "wordDuplicate", { word: dup.existing.word }), {
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    await prisma.word.create({
      data: {
        userId: user.id,
        word,
        translation,
        description,
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { conversationState: "idle", tempWord: null },
    });
    const newCount = await prisma.word.count({ where: { userId: user.id } });
    const msg = getMessage(user.nativeLanguage, "wordSaved", { word, translation });
    await sendMessage(chatId, `${msg}\n\nVocê tem ${newCount} palavras.`, {
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  // Consulta de palavra: usuário envia uma palavra (ex: vad) e o sistema responde se está cadastrada
  if (state === "idle") {
    const query = text.trim();
    if (query && !query.startsWith("/") && query.length <= 80) {
      const found = await prisma.word.findFirst({
        where: { userId: user.id, word: { equals: query, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
      });
      if (found) {
        const dateStr = found.createdAt.toLocaleDateString(
          user.nativeLanguage === "português" ? "pt-BR" : user.nativeLanguage === "svenska" ? "sv-SE" : "en-GB",
          { day: "numeric", month: "long", year: "numeric" }
        );
        const tip = found.description ?? found.example;
        const msg = tip
          ? getMessage(user.nativeLanguage, "wordLookupFoundWithTip", {
              word: found.word,
              translation: found.translation,
              tip,
              date: dateStr,
            })
          : getMessage(user.nativeLanguage, "wordLookupFound", {
              word: found.word,
              translation: found.translation,
              date: dateStr,
            });
        await sendMessage(chatId, msg);
        return;
      }
      await sendMessage(chatId, getMessage(user.nativeLanguage, "wordLookupNotFound"));
      return;
    }
    return;
  }
}
