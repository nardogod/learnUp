/**
 * Testa o webhook do Telegram enviando uma mensagem simulada.
 *
 * Uso: npm run test:bot -- "palavra nova"
 *      TELEGRAM_TEST_USER_ID=123456 npm run test:bot -- "palavra nova"
 *
 * Obtenha seu ID em: https://t.me/userinfobot
 * O usuário deve estar cadastrado (npm run register-user)
 */
import "dotenv/config";

const WEBHOOK_URL =
  process.env.WEBHOOK_TEST_URL || "https://learn-up-gold.vercel.app/api/webhook";
const message = process.argv[2] || "palavra nova";
const telegramIdStr = process.env.TELEGRAM_TEST_USER_ID;

async function main() {
  if (!telegramIdStr) {
    console.error("Defina TELEGRAM_TEST_USER_ID (seu Telegram ID)");
    console.error("Obtenha em: https://t.me/userinfobot");
    console.error("\nEx: TELEGRAM_TEST_USER_ID=123456789 npm run test:bot -- \"palavra nova\"");
    process.exit(1);
  }

  const telegramId = parseInt(telegramIdStr, 10);
  if (isNaN(telegramId)) {
    console.error("TELEGRAM_TEST_USER_ID deve ser um número");
    process.exit(1);
  }

  const payload = {
    update_id: Math.floor(Math.random() * 1e9),
    message: {
      message_id: Math.floor(Math.random() * 1e6),
      from: {
        id: telegramId,
        is_bot: false,
        first_name: "Test",
        username: "test",
      },
      chat: {
        id: telegramId,
        type: "private",
      },
      date: Math.floor(Date.now() / 1000),
      text: message,
    },
  };

  console.log(`Enviando para: ${WEBHOOK_URL}`);
  console.log(`Telegram ID: ${telegramId}`);
  console.log(`Mensagem: "${message}"\n`);

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log(`Status: ${res.status} ${res.statusText}`);
  const text = await res.text();
  if (text) console.log(`Resposta: ${text}`);

  if (res.ok) {
    console.log("\n✅ Webhook OK. Verifique o Telegram!");
  } else {
    console.error("\n❌ Erro no webhook");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
