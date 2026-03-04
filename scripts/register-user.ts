import "dotenv/config";
import * as readline from "readline";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

neonConfig.webSocketConstructor = ws;

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

const TIMEZONES = [
  { name: "Brasil (São Paulo)", value: "America/Sao_Paulo" },
  { name: "Suécia (Estocolmo)", value: "Europe/Stockholm" },
  { name: "UK (Londres)", value: "Europe/London" },
  { name: "Pular / deixar vazio", value: "" },
];

function parseOption<T>(input: string, options: T[], getValue: (o: T) => string): T | null {
  const n = parseInt(input, 10);
  if (n >= 1 && n <= options.length) return options[n - 1];
  const lower = input.toLowerCase();
  const found = options.find((o) => getValue(o).toLowerCase() === lower);
  return found ?? null;
}

async function main() {
  console.log("\n=== LearnUP - Cadastro de Usuário ===\n");

  const name = await ask("Nome do usuário? ");
  if (!name) {
    console.error("Nome é obrigatório.");
    rl.close();
    process.exit(1);
  }

  const email = await ask("Email do usuário? ");

  console.log("\nQual idioma o usuário fala?");
  LANGUAGES.forEach((l, i) => console.log(`  ${i + 1}. ${l}`));
  const nativeInput = await ask("Opção (1-3): ");
  const nativeLanguage = parseOption(nativeInput, LANGUAGES, (l) => l);
  if (!nativeLanguage) {
    console.error(`Opção inválida. Use 1, 2 ou 3.`);
    rl.close();
    process.exit(1);
  }

  console.log("\nQual idioma o usuário quer aprender?");
  LANGUAGES.forEach((l, i) => console.log(`  ${i + 1}. ${l}`));
  const targetInput = await ask("Opção (1-3): ");
  const targetLanguage = parseOption(targetInput, LANGUAGES, (l) => l);
  if (!targetLanguage) {
    console.error(`Opção inválida. Use 1, 2 ou 3.`);
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

  console.log("\nPlano?");
  console.log("  1. free");
  console.log("  2. premium");
  const planInput = await ask("Opção (1-2): ");
  const isPremium = planInput === "2" || planInput.toLowerCase() === "premium";

  let phrasesPerDay: number | null = null;
  if (isPremium) {
    const count = await ask("Quantas frases automáticas por dia? (1-10): ");
    const n = parseInt(count, 10);
    phrasesPerDay = n >= 1 && n <= 10 ? n : 3;
  }

  console.log("\nTimezone? (opcional)");
  TIMEZONES.forEach((t, i) => console.log(`  ${i + 1}. ${t.name}${t.value ? ` (${t.value})` : ""}`));
  const tzInput = await ask("Opção (1-4): ");
  let timezone: string | null = null;
  const tzNum = parseInt(tzInput, 10);
  if (tzNum >= 1 && tzNum <= TIMEZONES.length) {
    const t = TIMEZONES[tzNum - 1];
    timezone = t.value || null;
  }

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
