/**
 * Script de administração - listar, editar, excluir usuários e ver palavras.
 * Uso: npm run admin -- [comando] [args]
 *
 * Comandos:
 *   list              - Lista todos os usuários
 *   words <telegramId> - Lista palavras de um usuário
 *   delete <telegramId> - Exclui usuário e suas palavras
 *   edit <telegramId> - Edita um usuário (interativo)
 */
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

async function cmdList() {
  const users = await prisma.user.findMany({
    include: { _count: { select: { words: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (users.length === 0) {
    console.log("Nenhum usuário cadastrado.");
    return;
  }
  console.log("\n--- Usuários ---\n");
  for (const u of users) {
    console.log(`  ${u.telegramId} | ${u.name || "-"} | ${u.email || "-"} | ${u.nativeLanguage} → ${u.targetLanguage} | ${u.plan} | ${u._count.words} palavras`);
  }
}

async function cmdWords(telegramId: string) {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { words: true },
  });
  if (!user) {
    console.error("Usuário não encontrado.");
    return;
  }
  console.log(`\n--- Palavras de ${user.name} (${user.telegramId}) ---\n`);
  if (user.words.length === 0) {
    console.log("  Nenhuma palavra.");
    return;
  }
  for (const w of user.words) {
    console.log(`  • ${w.word} = ${w.translation}`);
  }
}

async function cmdDelete(telegramId: string) {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { _count: { select: { words: true } } },
  });
  if (!user) {
    console.error("Usuário não encontrado.");
    return;
  }
  const confirm = await ask(`Excluir ${user.name} (${user.telegramId}) e ${user._count.words} palavras? (s/n): `);
  if (confirm.toLowerCase() !== "s" && confirm.toLowerCase() !== "sim") {
    console.log("Cancelado.");
    return;
  }
  await prisma.user.delete({ where: { telegramId } });
  console.log("✅ Usuário excluído.");
}

async function cmdEdit(telegramId: string) {
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) {
    console.error("Usuário não encontrado.");
    return;
  }
  console.log(`\nEditando: ${user.name} (${user.telegramId})\n`);
  const name = await ask(`Nome [${user.name}]: `) || user.name;
  const email = await ask(`Email [${user.email || ""}]: `) || user.email;
  const plan = await ask(`Plano (free/premium) [${user.plan}]: `) || user.plan;
  let phrasesPerDay: number | null = user.phrasesPerDay;
  if (plan === "premium") {
    const defaultVal = user.phrasesPerDay ? String(user.phrasesPerDay) : "ilimitado";
    const n = await ask(`Frases/dia (1-10 ou ilimitado) [${defaultVal}]: `);
    if (!n || n.toLowerCase() === "ilimitado" || n.toLowerCase() === "i") {
      phrasesPerDay = null;
    } else {
      const num = parseInt(n, 10);
      phrasesPerDay = num >= 1 && num <= 10 ? num : user.phrasesPerDay;
    }
  } else {
    phrasesPerDay = null;
  }
  await prisma.user.update({
    where: { telegramId },
    data: { name, email, plan, phrasesPerDay },
  });
  console.log("✅ Usuário atualizado.");
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  try {
    switch (cmd) {
      case "list":
        await cmdList();
        break;
      case "words":
        if (!arg) {
          console.error("Uso: npm run admin -- words <telegramId>");
          process.exit(1);
        }
        await cmdWords(arg);
        break;
      case "delete":
        if (!arg) {
          console.error("Uso: npm run admin -- delete <telegramId>");
          process.exit(1);
        }
        await cmdDelete(arg);
        break;
      case "edit":
        if (!arg) {
          console.error("Uso: npm run admin -- edit <telegramId>");
          process.exit(1);
        }
        await cmdEdit(arg);
        break;
      default:
        console.log(`
Uso: npm run admin -- <comando> [args]

Comandos:
  list                 Lista todos os usuários
  words <telegramId>   Lista palavras de um usuário
  delete <telegramId>  Exclui usuário e suas palavras
  edit <telegramId>   Edita um usuário (interativo)
`);
    }
  } finally {
    rl.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
