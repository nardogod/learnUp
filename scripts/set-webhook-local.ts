/**
 * Define o webhook do Telegram para uma URL (ex: ngrok).
 * Uso: npx tsx scripts/set-webhook-local.ts https://abc123.ngrok-free.app
 *
 * O webhook será: <URL>/api/webhook
 */
import "dotenv/config";
import { setWebhook } from "../src/lib/telegram";

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Uso: npx tsx scripts/set-webhook-local.ts <URL_BASE>");
    console.error("Ex: npx tsx scripts/set-webhook-local.ts https://abc123.ngrok-free.app");
    process.exit(1);
  }

  const base = url.replace(/\/$/, "");
  const webhookUrl = `${base}/api/webhook`;

  console.log(`\n🔗 Configurando webhook: ${webhookUrl}\n`);

  const ok = await setWebhook(webhookUrl);
  if (ok) {
    console.log("✅ Webhook configurado! O Telegram enviará mensagens para sua máquina local.");
    console.log("   Lembre-se: npm run dev deve estar rodando e ngrok apontando para :3000\n");
  } else {
    console.error("❌ Erro ao configurar webhook. Verifique TELEGRAM_BOT_TOKEN no .env");
    process.exit(1);
  }
}

main();
