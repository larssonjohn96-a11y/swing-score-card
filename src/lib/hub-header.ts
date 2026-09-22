export type HubHeader = { title: string; to: "/" };

const HUB_HEADERS: Readonly<Record<string, HubHeader>> = {
  "/spela-runda": { title: "Spel & utmaningar", to: "/" },
  "/standardiserade-tester": { title: "Tester", to: "/" },
  "/utveckling": { title: "Jämför", to: "/" },
  "/spela": { title: "Match", to: "/" },
};

/** Index routes may be reached with or without a trailing slash. */
export function normalizeHeaderPath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

/** Only hub pages exit directly to Home; active game navigation is unchanged. */
export function getHubHeader(pathname: string): HubHeader | null {
  return HUB_HEADERS[normalizeHeaderPath(pathname)] ?? null;
}
