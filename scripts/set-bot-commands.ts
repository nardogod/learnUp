/**
 * Define os comandos do bot no menu do Telegram.
 * Execute após configurar o bot: npm run set-commands
 */
import "dotenv/config";
import { setMyCommands } from "../src/lib/telegram";

async function main() {
  const ok = await setMyCommands();
  if (ok) {
    console.log("✅ Comandos do bot configurados! Abra o Telegram e toque em / para ver o menu.");
  } else {
    console.error("❌ Erro ao configurar comandos. Verifique TELEGRAM_BOT_TOKEN no .env");
    process.exit(1);
  }
}

main();
