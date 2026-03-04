/**
 * Testa o LLM (Groq ou Ollama).
 * Groq: GROQ_API_KEY=gsk_xxx npm run test:ollama
 * Ollama: OLLAMA_BASE_URL=... npm run test:ollama
 */
import "dotenv/config";
import { generatePhrase } from "../src/lib/llm";

async function test() {
  const useGroq = !!process.env.GROQ_API_KEY;
  console.log(`\n🔍 Testando ${useGroq ? "Groq" : "Ollama"}...\n`);

  const words = [
    { word: "jag", translation: "eu" },
    { word: "heter", translation: "chamar-se" },
  ];

  try {
    const result = await generatePhrase("svenska", "português", words);
    if (!result) {
      console.error("❌ Geração falhou");
      process.exit(1);
    }
    console.log("✅ Geração OK:");
    console.log(`   📝 ${result.sentenceTarget}`);
    console.log(`   🇧🇷 ${result.sentenceNative}`);
    console.log(`   📚 ${result.wordsUsed.join(", ")}`);
    console.log("\n✅ LLM funcionando!\n");
  } catch (e) {
    console.error("❌ Erro:", e);
    process.exit(1);
  }
}

test();
