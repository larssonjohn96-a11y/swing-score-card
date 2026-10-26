import { Link } from "@tanstack/react-router";
import { AudioLines, ChevronRight } from "lucide-react";
import { GAME_SECTIONS } from "@/lib/game-catalogue";

export function GameOverview() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-slate-50 pb-28 text-slate-950">
      <div className="px-5 pt-6">
        <h1 className="text-[42px] font-black leading-none">Spel</h1>
        <p className="mt-4 max-w-sm text-[17px] font-medium leading-[1.5] text-slate-600">
          Spel som gör dig bättre på golf. Utmana dig själv och slå ditt personbästa.
        </p>
        {GAME_SECTIONS.map((section) => (
          <section key={section.title} aria-label={section.title} className="mt-8">
            <h2 className="px-0.5 font-display text-[30px] leading-none">{section.title}</h2>
            <div role="list" aria-label={`${section.title} – spel`} className="mt-3">
              {section.games.map((game) => (
                <div
                  key={game.id}
                  role="listitem"
                  className="relative h-[190px] w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"
                >
                  <Link
                    to="/spel/$gameId"
                    params={{ gameId: game.id }}
                    className="absolute inset-0 active:scale-[.99]"
                  >
                    <img
                      src={game.image}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover object-[18%_50%]"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/12 to-black/5" />
                    <span className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <strong className="font-display text-[28px] leading-none">
                        {game.title}
                      </strong>
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        ))}
        <section className="mt-8" aria-label="Träningsverktyg">
          <h2 className="px-0.5 font-display text-[30px] leading-none">Träningsverktyg</h2>
          <Link to="/tempotranare" className="mt-3 flex min-h-[118px] items-center gap-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition-transform active:scale-[.99]">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <AudioLines className="h-7 w-7" />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block font-display text-[26px] leading-none text-slate-950">Tempoträning</strong>
              <span className="mt-2 block text-xs leading-relaxed text-slate-600">Hitta rätt svingtempo med tre ljudsignaler. Full sving, närspel och puttning.</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
          </Link>
        </section>
      </div>
    </main>
  );
}
