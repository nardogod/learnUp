import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f0f12] text-zinc-100">
      {/* Subtle grid pattern */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          {/* Badge */}
          <span className="mb-6 inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-400">
            Bot no Telegram
          </span>

          <h1
            className="mb-6 text-5xl font-normal tracking-tight text-white sm:text-6xl"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            LearnUP
          </h1>

          <p className="mb-4 text-xl leading-relaxed text-zinc-400 sm:text-2xl">
            Aprenda sueco, inglês ou português cadastrando palavras e recebendo
            frases geradas por IA.
          </p>

          <p className="mb-12 max-w-lg mx-auto text-base text-zinc-500">
            Use o bot no Telegram para registrar vocabulário e praticar com
            frases contextuais 3x ao dia. Sem apps, sem cadastro web — só
            conversa.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={process.env.NEXT_PUBLIC_TELEGRAM_BOT_LINK || "https://t.me/veifelipe_bot"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0088cc] px-8 font-semibold text-white transition hover:bg-[#0077b5]"
            >
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Abrir no Telegram
            </a>
            <Link
              href="/api/health"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-600 px-8 font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Status da API
            </Link>
          </div>

          <div className="mt-20 grid gap-6 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <span className="text-2xl">📚</span>
              <h3 className="mt-2 font-semibold text-white">Palavras</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Cadastre vocabulário no idioma que está aprendendo.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <span className="text-2xl">🤖</span>
              <h3 className="mt-2 font-semibold text-white">Frases com IA</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Receba frases contextuais geradas automaticamente.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <span className="text-2xl">🌍</span>
              <h3 className="mt-2 font-semibold text-white">3 idiomas</h3>
              <p className="mt-1 text-sm text-zinc-500">
                Sueco, inglês e português. Interface no seu idioma.
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-24 text-center text-sm text-zinc-600">
          LearnUP · Bot de idiomas
        </footer>
      </main>
    </div>
  );
}
