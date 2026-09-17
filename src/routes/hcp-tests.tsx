import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CATEGORIES, type Category, type CategoryTest } from "@/lib/categories";

export const Route = createFileRoute("/hcp-tests")({
  head: () => ({
    meta: [
      { title: "HCP Tests – SG4" },
      { name: "description", content: "Snabba handicaptester som ger ett tydligt HCP-resultat i SG4." },
      { property: "og:title", content: "HCP Tests – SG4" },
      { property: "og:description", content: "Välj kategori, gör ett snabbt test och få ett HCP-resultat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HandicapTestsPage,
});

const CATEGORY_TONES: Record<string, string[]> = {
  driving: ["bg-[#34495e]", "bg-[#465a6c]"],
  approach: ["bg-[#2f76b7]", "bg-[#397fae]"],
  "around-the-green": ["bg-[#238263]", "bg-[#b87936]", "bg-[#39775e]"],
  puttning: ["bg-[#6757c7]", "bg-[#7656c9]"],
};

const CATEGORY_IMAGES: Record<string, string | undefined> = {
  puttning: "/b01e80c1-ac1d-4d11-81f0-5b9f362d0777.png",
  approach: "/HCP_inspel.png",
  driving: "/HCP_OFFtheTee_full.png",
};

const CATEGORY_IMAGE_POSITIONS: Record<string, string> = {
  driving: "50% 18%",
  approach: "50% 42%",
  puttning: "50% 42%",
};

const CATEGORY_PROMPTS: Record<string, string> = {
  driving: "Hur bra är du från tee?",
  approach: "Hur vassa är dina inspel?",
  "around-the-green": "Hur stark är du runt green?",
  puttning: "Hur säker är du på green?",
};

function toneFor(category: Category, index: number) {
  const tones = CATEGORY_TONES[category.slug] ?? ["bg-[#334155]"];
  return tones[index % tones.length];
}

function HcpCard({ category, test, index, fullWidth = false }: { category: Category; test: CategoryTest; index: number; fullWidth?: boolean }) {
  const imageSrc = CATEGORY_IMAGES[category.slug];
  const imagePosition = CATEGORY_IMAGE_POSITIONS[category.slug] ?? "50% 50%";
  return (
    <Link to={test.to} className={fullWidth ? "block w-full" : "block w-[calc(50%-4px)] shrink-0"}>
      <article className={`relative flex h-[220px] flex-col justify-end overflow-hidden rounded-[24px] border border-black/[.04] px-4 pb-4 pt-4 text-white ${toneFor(category, index)}`}>
        {imageSrc && (
          <>
            <img src={imageSrc} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: imagePosition }} />
            <span className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/18 to-black/5" />
          </>
        )}
        <span className="absolute left-4 top-4 rounded-full bg-white/14 px-2 py-1 text-[9px] font-black uppercase tracking-[.15em] text-white/85 backdrop-blur-md">HCP Test</span>
        <div className="relative z-10">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[.14em] text-white/72">{test.number} slag</p>
          <h3 className={`font-display leading-[.95] ${fullWidth ? "text-[30px]" : "text-[25px]"}`}>{test.title}</h3>
        </div>
      </article>
    </Link>
  );
}

function SpeedCard() {
  return (
    <Link to="/speed-test" className="block w-full">
      <article className="relative flex h-[220px] flex-col justify-end overflow-hidden rounded-[24px] border border-black/[.04] bg-[#7a4f32] px-4 pb-4 pt-4 text-white">
        <span className="absolute left-4 top-4 rounded-full bg-white/14 px-2 py-1 text-[9px] font-black uppercase tracking-[.15em] text-white/85 backdrop-blur-md">HCP Test</span>
        <div className="relative z-10">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[.14em] text-white/72">6 drives</p>
          <h3 className="font-display text-[30px] leading-[.95]">Speed Test</h3>
        </div>
      </article>
    </Link>
  );
}

function HandicapTestsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background pb-28">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 px-5 pb-4 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Tillbaka" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-blue-600">Få ett HCP-resultat</p>
            <h1 className="mt-0.5 text-[28px] font-black leading-none text-foreground">Hur bra är du?</h1>
          </div>
        </div>
        <p className="mt-2.5 max-w-sm text-[15px] font-medium leading-snug text-muted-foreground">Testa en del av spelet. Få svaret direkt.</p>
      </header>

      <div className="space-y-8 px-5 pt-5">
        <section>
          <div className="rounded-[24px] border border-blue-200 bg-blue-50/70 px-5 py-3.5">
            <p className="text-[9px] font-black uppercase tracking-[.17em] text-blue-600">Gör ett test</p>
            <h2 className="mt-1 text-[22px] font-black leading-tight text-foreground">Få ett handicapresultat direkt</h2>
            <p className="mt-1 text-[13px] font-medium leading-snug text-muted-foreground">Välj ett område och kör.</p>
          </div>
        </section>

        <section>
          <div className="px-0.5">
            <h2 className="text-[24px] font-black leading-none text-foreground">Speed</h2>
            <p className="mt-2 text-[15px] font-semibold leading-snug text-muted-foreground">Hur snabb är du?</p>
          </div>
          <div className="mt-3.5"><SpeedCard /></div>
        </section>

        {CATEGORIES.map((category) => {
          const single = category.tests.length === 1;
          return (
            <section key={category.slug}>
              <div className="px-0.5">
                <h2 className="text-[24px] font-black leading-none text-foreground">{category.title}</h2>
                <p className="mt-2 text-[15px] font-semibold leading-snug text-muted-foreground">{CATEGORY_PROMPTS[category.slug] ?? category.subtitle}</p>
              </div>
              <div className={single ? "mt-3.5" : "mt-3.5 flex gap-2 overflow-hidden"}>
                {category.tests.map((test, index) => <HcpCard key={`${category.slug}-${test.title}`} category={category} test={test} index={index} fullWidth={single} />)}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
