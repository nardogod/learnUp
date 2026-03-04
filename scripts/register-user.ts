import "dotenv/config";
import * as readline from "readline";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL não definida no .env");
  process.exit(1);
}
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

const LANGUAGES = ["português", "inglês", "svenska"];

async function main() {
  console.log("\n=== LearnUP - Cadastro de Usuário ===\n");

  const name = await ask("Nome do usuário? ");
  if (!name) {
    console.error("Nome é obrigatório.");
    rl.close();
    process.exit(1);
  }

  const email = await ask("Email do usuário? ");
  const nativeLanguage = await ask(
    `Qual idioma o usuário fala? (${LANGUAGES.join(" | ")}): `
  );
  if (!LANGUAGES.includes(nativeLanguage.toLowerCase())) {
    console.error(`Idioma inválido. Use: ${LANGUAGES.join(", ")}`);
    rl.close();
    process.exit(1);
  }

  const targetLanguage = await ask(
    `Qual idioma o usuário quer aprender? (${LANGUAGES.join(" | ")}): `
  );
  if (!LANGUAGES.includes(targetLanguage.toLowerCase())) {
    console.error(`Idioma inválido. Use: ${LANGUAGES.join(", ")}`);
    rl.close();
    process.exit(1);
  }

  const telegramIdRaw = await ask("Telegram ID do usuário? (obtido via @userinfobot): ");
  const telegramId = telegramIdRaw.trim();
  if (!telegramId) {
    console.error("Telegram ID é obrigatório.");
    rl.close();
    process.exit(1);
  }

  const plan = await ask("Plano? (free | premium): ");
  const isPremium = plan.toLowerCase() === "premium";

  let phrasesPerDay: number | null = null;
  if (isPremium) {
    const count = await ask("Quantas frases automáticas por dia? (1-10): ");
    const n = parseInt(count, 10);
    phrasesPerDay = n >= 1 && n <= 10 ? n : 3;
  }

  const timezone = await ask("Timezone? (opcional, ex: America/Sao_Paulo): ");

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email: email || null,
        telegramId,
        nativeLanguage: nativeLanguage.toLowerCase(),
        targetLanguage: targetLanguage.toLowerCase(),
        plan: isPremium ? "premium" : "free",
        phrasesPerDay: isPremium ? phrasesPerDay : null,
        timezone: timezone || null,
      },
    });
    console.log("\n✅ Usuário cadastrado com sucesso!");
    console.log(`   ID: ${user.id}`);
    console.log(`   Telegram ID: ${user.telegramId}`);
    console.log(`   Plano: ${user.plan}`);
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      console.error("❌ Erro: Telegram ID já cadastrado.");
    } else {
      console.error("❌ Erro ao cadastrar:", e);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
