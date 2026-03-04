import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkOllamaHealth } from "@/lib/llm";

export async function GET() {
  const result: { status: string; db: boolean; ollama: boolean } = {
    status: "ok",
    db: false,
    ollama: false,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    result.db = true;
  } catch {
    result.status = "degraded";
  }

  result.ollama = await checkOllamaHealth();
  if (!result.ollama) result.status = "degraded";

  return NextResponse.json(result);
}
