import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { ActivityStickyHeader } from "@/components/activity-sticky-header";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { THEME_SCRIPT } from "../lib/theme";
import { BottomNav } from "@/components/bottom-nav";
import { BottomNavVisibilityProvider } from "@/lib/bottom-nav-visibility";
import { SubscriptionProvider } from "@/lib/subscription";
import { DevPlanSwitcher } from "@/components/dev-plan-switcher";
import { SplashScreen, useSplash } from "@/components/splash-screen";
import { startSessionSync } from "@/lib/sessions/startup";
import { ActiveMultiplayerBanner } from "@/components/active-multiplayer-banner";
import { ShotSyncStatus } from "@/components/shot-sync-status";
import { startShotSync } from "@/lib/shot-bank";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <div className="mt-6"><Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Go home</Link></div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1><p className="mt-2 text-sm text-muted-foreground">Something went wrong on our end. You can try refreshing or head back home.</p><div className="mt-6 flex flex-wrap justify-center gap-2"><button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Try again</button><Link to="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">Go home</Link></div></div></div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SG4 – Testa hela ditt spel och sänk ditt handicap" },
      { name: "description", content: "SG4 mäter ditt spel i fyra kategorier: driving, approach, around the green och puttning. Kör testerna, följ utvecklingen och få personliga träningsprogram." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "SG4 – Testa hela ditt spel" },
      { name: "twitter:title", content: "SG4 – Testa hela ditt spel" },
      { property: "og:description", content: "Mät, följ och förbättra ditt golfspel från utslag till putt med SG4." },
      { name: "twitter:description", content: "Mät, följ och förbättra ditt golfspel från utslag till putt med SG4." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fd1440f1-021b-448e-b236-f00665931288/id-preview-6339d7c2--e6eaffe8-9d53-49c7-8353-659215697a59.lovable.app-1785048898778.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/fd1440f1-021b-448e-b236-f00665931288/id-preview-6339d7c2--e6eaffe8-9d53-49c7-8353-659215697a59.lovable.app-1785048898778.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: "/card-overrides.css" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return <html lang="sv" className="light"><head><HeadContent /><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head><body>{children}<Scripts /></body></html>;
}

const TRAINING_CATEGORY_PARENT: Record<string, string> = {
  "/speed": "/traning?category=off-the-tee",
  "/longdrive": "/traning?category=off-the-tee",
  "/fairway-streak": "/traning?category=off-the-tee",
  "/driver-konsekvens": "/traning?category=off-the-tee",
  "/approach-pei-valj": "/traning?category=approach",
  "/shot-shaping": "/traning?category=approach",
  "/8-bollar": "/traning?category=around-the-green",
  "/upp-och-in": "/traning?category=around-the-green",
  "/bunker-traning": "/traning?category=around-the-green",
  "/putting-streak": "/traning?category=putting",
  "/lagputt-ladder": "/traning?category=putting",
  "/klock-putt": "/traning?category=putting",
  "/pga-tour-18-puttar": "/traning?category=putting",
  "/50-bollar": "/traning?category=putting",
  "/lagputt": "/traning?category=putting",
  "/tutor-test": "/traning?category=putting",
  "/green-reading": "/traning?category=putting",
  "/putting-data": "/traning?category=putting",
};

const TRAINING_DETAIL_PARENT: Record<string, string> = {
  "/50-bollar-resultat": "/50-bollar",
  "/8-bollar-historik": "/8-bollar",
  "/lagputt-historik": "/lagputt",
  "/driver-konsekvens-historik": "/driver-konsekvens",
  "/green-reading-historik": "/green-reading",
  "/pga-tour-18-puttar-historik": "/pga-tour-18-puttar",
  "/tutor-test-historik": "/tutor-test",
  "/approach-pei-historik": "/approach-pei-valj",
  "/approach-pei-wedge-historik": "/approach-pei-valj",
  "/approach-pei-iron-historik": "/approach-pei-valj",
  "/shot-shaping-9-window-historik": "/shot-shaping",
  "/shot-shaping-konstant-historik": "/shot-shaping",
  "/shot-shaping-vaxlande-historik": "/shot-shaping",
  "/wedge-stege-historik": "/traning?category=approach",
};

function trainingFallback(pathname: string, search: string) {
  const params = new URLSearchParams(search);
  if (pathname === "/traning") return params.has("category") ? "/traning" : "/";
  if (pathname === "/traning-progress") {
    const category = params.get("category");
    return category ? `/traning?category=${encodeURIComponent(category)}` : "/traning";
  }
  if (TRAINING_DETAIL_PARENT[pathname]) return TRAINING_DETAIL_PARENT[pathname];
  if (pathname.startsWith("/shot-shaping-") && !pathname.endsWith("-historik")) return "/shot-shaping";
  if (pathname === "/approach-pei" || pathname === "/approach-pei-wedge" || pathname === "/approach-pei-iron") return "/approach-pei-valj";
  return TRAINING_CATEGORY_PARENT[pathname] ?? null;
}


type WakeLockHandle = {
  released?: boolean;
  release: () => Promise<void>;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockHandle>;
  };
};

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { show, dismiss } = useSplash();
  const location = useLocation();
  const router = useRouter();
  const trainingHome = location.pathname === "/traning" && !new URLSearchParams(location.searchStr ?? "").has("category");
  const routeTransitionKey = `${location.pathname}${location.searchStr ?? ""}`;

  useEffect(() => startSessionSync(), []);
  useEffect(() => startShotSync(), []);

  useEffect(() => {
    const wakeLockNavigator = navigator as WakeLockNavigator;
    if (!wakeLockNavigator.wakeLock) return;

    let handle: WakeLockHandle | null = null;
    let requesting = false;
    let disposed = false;

    const requestWakeLock = async () => {
      if (disposed || requesting || document.visibilityState !== "visible" || (handle && !handle.released)) return;
      requesting = true;
      try {
        handle = await wakeLockNavigator.wakeLock?.request("screen") ?? null;
      } catch {
      } finally {
        requesting = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void requestWakeLock();
    };

    const handleFirstInteraction = () => {
      void requestWakeLock();
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("pointerdown", handleFirstInteraction, { passive: true });

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("pointerdown", handleFirstInteraction);
      if (handle && !handle.released) void handle.release().catch(() => undefined);
      handle = null;
    };
  }, []);

  useEffect(() => {
    const pushInternal = (href: string) => {
      router.history.push(href);
    };

    const goBackNaturally = (control: HTMLElement) => {
      const trainingParent = trainingFallback(window.location.pathname, window.location.search);
      if (trainingParent) { pushInternal(trainingParent); return; }

      const state = window.history.state as { __TSR_index?: number } | null;
      const hasTanStackHistory = typeof state?.__TSR_index === "number" && state.__TSR_index > 0;
      const hasSameOriginReferrer = Boolean(document.referrer && document.referrer.startsWith(window.location.origin));

      if (hasTanStackHistory || hasSameOriginReferrer) { router.history.back(); return; }
      const href = control instanceof HTMLAnchorElement ? control.getAttribute("href") : null;
      if (href && href.startsWith("/") && href !== window.location.pathname) pushInternal(href);
      else pushInternal("/tester");
    };

    const handleNavigationControl = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const control = target?.closest<HTMLElement>("a,button");
      if (!control || control.hasAttribute("data-local-navigation")) return;
      if (control.hasAttribute("data-test-abort")) {
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent("sg4-test-abort"));
        return;
      }
      const label = control.getAttribute("aria-label")?.trim().toLowerCase() ?? "";
      const text = control.textContent?.trim().toLowerCase() ?? "";
      const hasArrowLeft = Boolean(control.querySelector(".lucide-arrow-left"));
      const explicitlyDynamicBack = control.hasAttribute("data-dynamic-back");
      const explicitlyDynamicCancel = control.hasAttribute("data-dynamic-cancel");
      const isBackControl = explicitlyDynamicBack || hasArrowLeft || label === "tillbaka" || text === "tillbaka" || text.startsWith("tillbaka till ");
      const isCancelNavigation = explicitlyDynamicCancel || text.startsWith("avbryt test") || (control instanceof HTMLAnchorElement && text === "avbryt");
      if (!isBackControl && !isCancelNavigation) return;
      event.preventDefault();
      event.stopPropagation();
      goBackNaturally(control);
    };

    document.addEventListener("click", handleNavigationControl, true);
    return () => document.removeEventListener("click", handleNavigationControl, true);
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <SubscriptionProvider>
        <BottomNavVisibilityProvider>
          <div className="relative min-h-screen pb-20">
            <ActivityStickyHeader pathname={location.pathname} />
            {trainingHome ? <div className="mx-auto w-full max-w-md px-5 pt-6"><Link to="/" data-dynamic-back aria-label="Tillbaka till Hem" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/80 bg-white/70 text-xl leading-none text-slate-800 shadow-sm backdrop-blur-xl">‹</Link></div> : null}
            <div key={routeTransitionKey} className="sg4-route-transition"><Outlet /></div>
            <ActiveMultiplayerBanner />
            <ShotSyncStatus />
            <BottomNav />
            <DevPlanSwitcher />
          </div>
          {show && <SplashScreen onDismiss={dismiss} />}
        </BottomNavVisibilityProvider>
      </SubscriptionProvider>
    </QueryClientProvider>
  );
}
