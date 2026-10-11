import { GAME_SECTIONS } from "@/lib/game-catalogue";

export function GameOverview() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-[calc(112px+env(safe-area-inset-bottom))] text-foreground">
      <div className="px-5 pt-6">
        <h1 className="text-[42px] font-black leading-none tracking-normal">Spel</h1>
        <p className="mt-4 max-w-sm text-[17px] font-medium leading-relaxed text-muted-foreground">Utvecklas genom att spela, slå rekord och utmana vänner.</p>
      </div>
      <div className="space-y-8 px-5 pt-8">
        {GAME_SECTIONS.map((section) => (
          <section key={section.title} aria-label={section.title}>
            <h2 className="text-[24px] font-black leading-none tracking-normal">{section.title}</h2>
            <p className="mt-1.5 text-xs font-bold text-muted-foreground">{section.subtitle}</p>
            <div role="list" aria-label={`${section.title} – spel`} className="-mx-5 mt-3.5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {section.games.map((game) => (
                <article key={game.title} role="listitem" className="relative flex h-[288px] w-[224px] shrink-0 snap-start flex-col overflow-hidden rounded-[26px] border border-border bg-card text-card-ink shadow-sm">
                  <img src={game.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[18%_50%]" />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-art-overlay via-art-overlay/60 to-art-overlay/5" />
                  <span className="relative mx-4 mt-4 w-fit rounded-full border border-card-ink/25 bg-art-overlay/60 px-2.5 py-1 text-[10px] font-bold">Kommer snart</span>
                  <div className="relative mt-auto px-4 pb-5">
                    <h3 className="font-display text-[30px] leading-none tracking-normal">{game.title}</h3>
                    <p className="mt-2 text-[13px] font-medium leading-snug text-card-ink/90">{game.description}</p>
                    <p className="mt-3 text-[10px] font-bold text-card-ink/85">{game.metadata}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}