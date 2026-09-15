export type BotMatchCategory = "off-the-tee" | "approach" | "around-the-green" | "putting" | "bunker";
export type BotMatchWinner = "player" | "bot";

export type BotCategoryHistory = {
  meetings: number;
  playerWins: number;
  botWins: number;
  playerStreak: number;
  botStreak: number;
  lastWinner?: BotMatchWinner;
  lastMargin?: number;
  averageMargin: number;
};

type HistoryStore = Record<string, Record<BotMatchCategory, BotCategoryHistory>>;

const STORE_KEY = "sg4-bot-category-history-v1";

const emptyHistory = (): BotCategoryHistory => ({
  meetings: 0,
  playerWins: 0,
  botWins: 0,
  playerStreak: 0,
  botStreak: 0,
  averageMargin: 0,
});

function readStore(): HistoryStore {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}") as HistoryStore;
  } catch {
    return {};
  }
}

export function getBotCategoryHistory(botId: string, category: BotMatchCategory): BotCategoryHistory {
  return readStore()[botId]?.[category] ?? emptyHistory();
}

export function recordBotCategoryMatch(
  botId: string,
  category: BotMatchCategory,
  winner: BotMatchWinner,
  margin = 1,
) {
  if (typeof window === "undefined") return;
  const store = readStore();
  const current = store[botId]?.[category] ?? emptyHistory();
  const meetings = current.meetings + 1;
  const safeMargin = Math.max(0, Math.abs(margin));
  const next: BotCategoryHistory = {
    meetings,
    playerWins: current.playerWins + (winner === "player" ? 1 : 0),
    botWins: current.botWins + (winner === "bot" ? 1 : 0),
    playerStreak: winner === "player" ? current.playerStreak + 1 : 0,
    botStreak: winner === "bot" ? current.botStreak + 1 : 0,
    lastWinner: winner,
    lastMargin: safeMargin,
    averageMargin: ((current.averageMargin * current.meetings) + safeMargin) / meetings,
  };
  store[botId] = { ...(store[botId] ?? {}), [category]: next } as Record<BotMatchCategory, BotCategoryHistory>;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function categoryLabel(category: BotMatchCategory) {
  if (category === "putting") return "putting";
  if (category === "around-the-green") return "chipping";
  if (category === "approach") return "approach";
  return "från tee";
}
