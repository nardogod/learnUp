type Language = "português" | "inglês" | "svenska";

const langMap: Record<string, Language> = {
  portugues: "português",
  português: "português",
  pt: "português",
  ingles: "inglês",
  inglês: "inglês",
  en: "inglês",
  english: "inglês",
  svenska: "svenska",
  sv: "svenska",
  swedish: "svenska",
};

const messages: Record<Language, Record<string, string>> = {
  "português": {
    welcome:
      "Olá! Bem-vindo ao LearnUP. Use /palavras para ver suas palavras, /frase para gerar uma frase, ou /addword para cadastrar nova palavra.",
    newWord: "Qual palavra você aprendeu?",
    whatMeans: 'O que "{word}" significa?',
    wordTipPrompt: 'Dica opcional para "{word}":',
    wordTipSkip: "Pular",
    wordSaved: '✅ Salvo! "{word}" = {translation}',
    notRegistered: "Você não está cadastrado. Peça ao administrador para te registrar.",
    limitReached: "Limite de 100 palavras no plano free. Faça upgrade!",
    ranking: "🏆 Top 3\n1º {name1} - {count1} palavras\n2º {name2} - {count2} palavras\n3º {name3} - {count3} palavras",
    cancel: "Operação cancelada.",
    noWords: "Você ainda não tem palavras cadastradas. Use /addword para começar!",
    planFree: "📋 Plano Free\n• 100 palavras\n• 3 frases automáticas/dia\n• 10 /frase por dia\n\nFaça upgrade para premium!",
    planPremium: "📋 Plano Premium\n• Palavras ilimitadas\n• Frases automáticas: {count}/dia\n• /frase ilimitado",
    planPremiumUnlimited: "📋 Plano Premium\n• Palavras ilimitadas\n• Frases automáticas: ilimitadas\n• /frase ilimitado",
    tryAgain:
      "O serviço de geração de frases está temporariamente indisponível ou sobrecarregado. Tente novamente em 1–2 minutos. Enquanto isso, use /palavras para revisar seu vocabulário.",
    fraseLimitReached: "Você atingiu o limite de 10 frases por dia no plano free. Use /plan para ver opções.",
    fewWordsForVariety: "Ainda há poucas palavras para frases novas sem repetir. Aprenda mais palavras com /addword!",
    phrasesLeft: "📊 {left} frases restantes hoje • {total} palavras",
    phrasesLeftUnlimited: "📊 Ilimitado • {total} palavras",
    addPhrasePrompt: "Envie uma frase em {lang} para extrair as palavras:",
    phraseWordsSaved: "✅ {count} palavras extraídas e salvas! Total: {total}",
    phraseWordsPartial: "✅ {saved} salvas (limite atingido). Total: {total}",
    editWordPrompt: "Qual palavra você quer trocar o significado?",
    editWordAskNew: "Novo significado para \"{word}\":",
    editWordSaved: "✅ Significado de \"{word}\" atualizado para: {translation}",
    editWordNotFound: "Palavra \"{word}\" não encontrada. Use /palavras para ver suas palavras.",
    wordLookupFound: "📖 {word} = {translation}\n\n📅 Cadastrada em {date}",
    wordLookupFoundWithTip: "📖 {word} = {translation}\n\n💡 {tip}\n\n📅 Cadastrada em {date}",
    wordLookupNotFound: "Não temos esta palavra cadastrada.",
    wordDuplicate: '⚠️ "{word}" já existe no vocabulário.',
    deduplicateDone: "🧹 Limpeza concluída! {removed} duplicatas removidas. Total: {total} palavras.",
    goodMorning: "☀️ Bom dia! Hora de praticar!",
    goodAfternoon: "☀️ Boa tarde! Hora de praticar!",
    goodNight: "🌙 Boa noite! Hora de praticar!",
  },
  inglês: {
    welcome:
      "Hello! Welcome to LearnUP. Use /palavras to see your words, /frase to generate a sentence, or /addword to add a new word.",
    newWord: "What word did you learn?",
    whatMeans: 'What does "{word}" mean?',
    wordTipPrompt: 'Optional tip for "{word}":',
    wordTipSkip: "Skip",
    wordSaved: '✅ Saved! "{word}" = {translation}',
    notRegistered: "You are not registered. Ask the administrator to register you.",
    limitReached: "100 word limit on free plan. Upgrade!",
    ranking: "🏆 Top 3\n1st {name1} - {count1} words\n2nd {name2} - {count2} words\n3rd {name3} - {count3} words",
    cancel: "Operation cancelled.",
    noWords: "You don't have any words yet. Use /addword to get started!",
    planFree: "📋 Free Plan\n• 100 words\n• 3 automatic phrases/day\n• 10 /frase per day\n\nUpgrade to premium!",
    planPremium: "📋 Premium Plan\n• Unlimited words\n• Automatic phrases: {count}/day\n• /frase unlimited",
    planPremiumUnlimited: "📋 Premium Plan\n• Unlimited words\n• Automatic phrases: unlimited\n• /frase unlimited",
    tryAgain:
      "The phrase generation service is temporarily unavailable or overloaded. Try again in 1–2 minutes. Meanwhile, use /palavras to review your vocabulary.",
    fraseLimitReached: "You've reached the 10 phrases per day limit on the free plan. Use /plan for options.",
    fewWordsForVariety: "Not enough words for new phrases without repeating. Learn more words with /addword!",
    phrasesLeft: "📊 {left} phrases left today • {total} words",
    phrasesLeftUnlimited: "📊 Unlimited • {total} words",
    addPhrasePrompt: "Send a sentence in {lang} to extract words:",
    phraseWordsSaved: "✅ {count} words extracted and saved! Total: {total}",
    phraseWordsPartial: "✅ {saved} saved (limit reached). Total: {total}",
    editWordPrompt: "Which word do you want to change the meaning of?",
    editWordAskNew: "New meaning for \"{word}\":",
    editWordSaved: "✅ Meaning of \"{word}\" updated to: {translation}",
    editWordNotFound: "Word \"{word}\" not found. Use /palavras to see your words.",
    wordLookupFound: "📖 {word} = {translation}\n\n📅 Registered on {date}",
    wordLookupFoundWithTip: "📖 {word} = {translation}\n\n💡 {tip}\n\n📅 Registered on {date}",
    wordLookupNotFound: "We don't have this word registered.",
    wordDuplicate: '⚠️ "{word}" already exists in your vocabulary.',
    deduplicateDone: "🧹 Cleanup done! {removed} duplicates removed. Total: {total} words.",
    goodMorning: "☀️ Good morning! Time to practice!",
    goodAfternoon: "☀️ Good afternoon! Time to practice!",
    goodNight: "🌙 Good evening! Time to practice!",
  },
  svenska: {
    welcome:
      "Hej! Välkommen till LearnUP. Använd /palavras för att se dina ord, /frase för att generera en mening, eller /addword för att lägga till ord.",
    newWord: "Vilket ord lärde du dig?",
    whatMeans: 'Vad betyder "{word}"?',
    wordTipPrompt: 'Valfri tips för "{word}":',
    wordTipSkip: "Hoppa över",
    wordSaved: '✅ Sparat! "{word}" = {translation}',
    notRegistered: "Du är inte registrerad. Be administratören att registrera dig.",
    limitReached: "100 ordsgräns på free-planen. Uppgradera!",
    ranking: "🏆 Topp 3\n1:a {name1} - {count1} ord\n2:a {name2} - {count2} ord\n3:e {name3} - {count3} ord",
    cancel: "Åtgärd avbruten.",
    noWords: "Du har inga ord ännu. Använd /addword för att komma igång!",
    planFree: "📋 Free-plan\n• 100 ord\n• 3 automatiska fraser/dag\n• 10 /frase per dag\n\nUppgradera till premium!",
    planPremium: "📋 Premium-plan\n• Obegränsade ord\n• Automatiska fraser: {count}/dag\n• /frase obegränsat",
    planPremiumUnlimited: "📋 Premium-plan\n• Obegränsade ord\n• Automatiska fraser: obegränsat\n• /frase obegränsat",
    tryAgain:
      "Frasgenereringstjänsten är tillfälligt otillgänglig eller överbelastad. Försök igen om 1–2 minuter. Använd /palavras för att granska ditt ordförråd under tiden.",
    fraseLimitReached: "Du har nått gränsen på 10 fraser per dag på free-planen. Använd /plan för alternativ.",
    fewWordsForVariety: "Inte tillräckligt med ord för nya fraser utan att upprepa. Lär dig fler ord med /addword!",
    phrasesLeft: "📊 {left} fraser kvar idag • {total} ord",
    phrasesLeftUnlimited: "📊 Obegränsat • {total} ord",
    addPhrasePrompt: "Skicka en mening på {lang} för att extrahera ord:",
    phraseWordsSaved: "✅ {count} ord extraherade och sparade! Totalt: {total}",
    phraseWordsPartial: "✅ {saved} sparade (gräns nådd). Totalt: {total}",
    editWordPrompt: "Vilket ord vill du byta betydelsen på?",
    editWordAskNew: "Ny betydelse för \"{word}\":",
    editWordSaved: "✅ Betydelsen av \"{word}\" uppdaterad till: {translation}",
    editWordNotFound: "Ordet \"{word}\" hittades inte. Använd /palavras för att se dina ord.",
    wordLookupFound: "📖 {word} = {translation}\n\n📅 Registrerad {date}",
    wordLookupFoundWithTip: "📖 {word} = {translation}\n\n💡 {tip}\n\n📅 Registrerad {date}",
    wordLookupNotFound: "Vi har inte detta ord registrerat.",
    wordDuplicate: '⚠️ "{word}" finns redan i ditt ordförråd.',
    deduplicateDone: "🧹 Städning klar! {removed} dubbletter borttagna. Totalt: {total} ord.",
    goodMorning: "☀️ God morgon! Dags att öva!",
    goodAfternoon: "☀️ God eftermiddag! Dags att öva!",
    goodNight: "🌙 God kväll! Dags att öva!",
  },
};

export function getLanguage(nativeLanguage: string): Language {
  const normalized = nativeLanguage.toLowerCase().trim().replace(/\s/g, "");
  return langMap[normalized] ?? "português";
}

export function getMessage(
  nativeLanguage: string,
  key: string,
  params?: Record<string, string | number>
): string {
  const lang = getLanguage(nativeLanguage);
  let msg = messages[lang][key] ?? messages["português"][key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return msg;
}
