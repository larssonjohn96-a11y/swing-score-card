import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";

type Category = "off-the-tee" | "approach" | "around-the-green" | "putting";

type CategoryItem = {
  id: Category;
  title: string;
  svTitle: string;
  description: string;
};

const CATEGORIES: CategoryItem[] = [
  { id: "off-the-tee", title: "Off the Tee", svTitle: "Utslag", description: "Fart, längd och driverkontroll" },
  { id: "approach", title: "Approach", svTitle: "Inspel", description: "Precision och bollkontroll" },
  { id: "around-the-green", title: "Around the Green", svTitle: "Närspel", description: "Slagvariation och scoring" },
  { id: "putting", title: "Putting", svTitle: "Puttning", description: "Startlinje, längdkontroll och greenläsning" },
];

export const Route = createFileRoute("/traning-progress")({
  component: TrainingProgressPage,
});

function CategoryAnalysisLink({ item }: { item: CategoryItem }) {
  const cardClass =
    "group flex min-h-[154px] w-full flex-col justify-between rounded-3xl border border-border bg-card p-4 text-left shadow-[var(--shadow-glow)] transition-colors hover:border-primary";

  const content = (
    <>
      <span className="block min-h-[88px]">
        <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {item.title}
        </span>
        <span className="mt-1 block font-display text-[26px] leading-none text-foreground">{item.svTitle}</span>
        <span className="mt-2 block min-h-[32px] text-[11px] leading-snug text-muted-foreground">
          {item.description}
        </span>
      </span>
      <span className="mt-4 flex items-center justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">Se analys</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5" />
      </span>
    </>
  );

  if (item.id === "putting") {
    return (
      <Link to="/putting-data" className={cardClass}>
        {content}
      </Link>
    );
  }

  const slug = item.id === "off-the-tee" ? "driving" : item.id;

  return (
    <Link to="/utveckling/$slug" params={{ slug }} className={cardClass}>
      {content}
    </Link>
  );
}

function TrainingProgressPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-6">
      <header>
        <div className="flex items-center gap-3">
          <Link
            to="/traning"
            search={{ category: undefined }}
            aria-label="Tillbaka till Träning"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Träning</p>
            <h1 className="mt-1 font-display text-3xl leading-none">Analys & framsteg</h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          En central analyssida per kategori. Här samlas nivå, utveckling, historik och fördjupad analys på ett ställe.
        </p>
      </header>

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Välj kategori</p>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">4 områden</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {CATEGORIES.map((item) => (
            <CategoryAnalysisLink key={item.id} item={item} />
          ))}
        </div>
      </section>
    </main>
  );
}
