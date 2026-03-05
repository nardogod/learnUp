/**
 * Verifica para onde o webhook do Telegram está apontando.
 * Uso: npx tsx scripts/check-webhook.ts
 */
import "dotenv/config";

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN não definido no .env");
    process.exit(1);
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const data = (await res.json()) as { ok: boolean; result?: { url?: string } };
  if (!data.ok) {
    console.error("Erro ao verificar webhook:", data);
    process.exit(1);
  }

  const url = data.result?.url || "(nenhum)";
  console.log("\n📍 Webhook atual:", url);
  console.log("");
  if (!url || url === "(nenhum)") {
    console.log("   O Telegram não está enviando mensagens para nenhum servidor.");
    console.log("   Configure com: npm run webhook:local -- https://SEU_NGROK_URL");
  } else if (url.includes("localhost")) {
    console.log("   ⚠️ localhost não funciona - Telegram precisa de URL pública.");
    console.log("   Use ngrok: ngrok http 3000");
    console.log("   Depois: npm run webhook:local -- https://SEU_NGROK_URL");
  } else if (url.includes("abc123")) {
    console.log("   ⚠️ URL é placeholder (abc123) - não funciona! Configure com sua URL real:");
    console.log("   1. Rode: ngrok http 3000");
    console.log("   2. Copie a URL HTTPS (ex: https://a1b2c3d4.ngrok-free.app)");
    console.log("   3. Rode: npm run webhook:local -- https://SUA_URL");
  } else if (url.includes("ngrok") || url.includes("cloudflared")) {
    console.log("   ✅ Apontando para túnel local. Se não responde: ngrok está rodando? npm run dev?");
  } else {
    console.log("   Provavelmente apontando para Vercel/produção.");
    console.log("   Para rodar local: npm run webhook:local -- https://SEU_NGROK_URL");
  }
  console.log("");
}

main();
