/**
 * Testa a API do Ollama (local ou Render).
 * Uso: OLLAMA_BASE_URL=https://learnup-ollama.onrender.com npm run test:ollama
 * Ou: npm run test:ollama (usa localhost)
 */
import "dotenv/config";

const BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:0.5b";

async function test() {
  console.log(`\n🔍 Testando Ollama em ${BASE}\n`);

  // 1. Listar modelos
  let names: string[] = [];
  try {
    const tagsRes = await fetch(`${BASE}/api/tags`);
    if (!tagsRes.ok) {
      throw new Error(`Tags: ${tagsRes.status} ${await tagsRes.text()}`);
    }
    const tags = (await tagsRes.json()) as { models?: { name: string }[] };
    names = tags.models?.map((m) => m.name) ?? [];
    console.log("✅ Modelos disponíveis:", names.length ? names.join(", ") : "(nenhum)");
  } catch (e) {
    console.error("❌ Erro ao listar modelos:", e);
    console.log("\n💡 Se for Render Free: o serviço pode estar acordando (~1 min). Tente de novo.");
    process.exit(1);
  }

  // 2. Verificar se o modelo configurado existe
  const modelExists = names.some((n) => n === MODEL || n.startsWith(MODEL + ":"));
  if (!modelExists) {
    console.error(`❌ Modelo "${MODEL}" não encontrado. Disponíveis: ${names.join(", ")}`);
    console.log(`\n💡 Para local: OLLAMA_MODEL=qwen2.5:7b (ou outro instalado)`);
    console.log(`   Para Render: OLLAMA_MODEL=qwen2.5:0.5b\n`);
    process.exit(1);
  }

  // 3. Gerar frase de teste (como o bot faz)
  try {
    const genRes = await fetch(`${BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: 'Responda APENAS em JSON: {"sentenceTarget":"Hej!","sentenceNative":"Oi!"}',
        stream: false,
        format: "json",
      }),
    });
    if (!genRes.ok) {
      throw new Error(`Generate: ${genRes.status} ${await genRes.text()}`);
    }
    const data = (await genRes.json()) as { response?: string };
    console.log("✅ Geração OK:", (data.response ?? "").slice(0, 80) + "...");
  } catch (e) {
    console.error("❌ Erro ao gerar:", e);
    process.exit(1);
  }

  console.log("\n✅ Ollama funcionando!\n");
}

test();
