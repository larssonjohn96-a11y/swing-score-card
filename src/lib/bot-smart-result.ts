import { BOT_PERSONALITIES } from "@/lib/bot-personality";
import { categoryLabel, getBotCategoryHistory, type BotMatchCategory } from "@/lib/bot-match-history";
import type { BotNextStep } from "@/lib/bot-next-step";

function pick(lines: string[], seed: number) {
  return lines[Math.abs(seed) % Math.max(1, lines.length)] ?? "Bra match.";
}

function historyLead(botName: string, botId: string, category: BotMatchCategory) {
  const h = getBotCategoryHistory(botId, category);
  if (h.meetings < 2) return "";
  const label = categoryLabel(category);
  if (h.botStreak >= 2) return `Det där är ${h.botStreak} raka för mig mot dig i ${label}. `;
  if (h.playerStreak >= 2) return `Okej, ${h.playerStreak} raka för dig mot mig i ${label}. `;
  if (h.meetings >= 3 && h.botWins / h.meetings >= 0.67) return `Du brukar ha det tungt mot mig i ${label} — ${h.botWins}–${h.playerWins}. `;
  if (h.meetings >= 3 && h.playerWins / h.meetings >= 0.67) return `Du börjar faktiskt ha övertaget mot mig i ${label} — ${h.playerWins}–${h.botWins}. `;
  if (h.meetings >= 3) return `Vi känner varandras spel i ${label} vid det här laget. `;
  return `${botName} minns förra matchen. `;
}

function actionTail(botId: string, action: BotNextStep["action"], targetBotName?: string) {
  const type = BOT_PERSONALITIES[botId]?.type;
  if (action === "challenge" && targetBotName) {
    if (type === "grumpy-old-guy") return `Försök slå ${targetBotName} också innan du börjar bli för nöjd.`;
    if (type === "trash-talker") return `Okej då. Testa ${targetBotName} och se om det håller där också.`;
    if (type === "laid-back") return `${targetBotName} känns som en bra nästa match. Kör den.`;
    if (type === "know-it-all") return `Nästa logiska test är ${targetBotName}. Det säger mer om nivån.`;
    if (type === "silent-killer") return `${targetBotName} nästa.`;
    if (type === "hothead") return `Fine. Gå och spela ${targetBotName}. Jag vill ändå ha revansch sen.`;
    if (type === "friendly-veteran") return `Du borde prova ${targetBotName} nu. Det blir ett fint nästa test.`;
    if (type === "golf-purist") return `${targetBotName} är ett bra nästa steg. Samma disciplin igen.`;
    if (type === "competitive-grinder") return `Bra. Nästa benchmark är ${targetBotName}.`;
    if (type === "tour-professional") return `${targetBotName} är nästa nivå.`;
    return `Testa ${targetBotName} härnäst.`;
  }

  if (type === "grumpy-old-guy") return "Försök igen om du absolut måste.";
  if (type === "trash-talker") return "Kör igen. Vi ser om du kan göra om det.";
  if (type === "laid-back") return "En till känns rimligt.";
  if (type === "know-it-all") return "Spela om den och gör bättre beslut den här gången.";
  if (type === "silent-killer") return "Igen.";
  if (type === "hothead") return "Direkt igen.";
  if (type === "friendly-veteran") return "Vi tar gärna en till.";
  if (type === "golf-purist") return "En till. Samma rutin.";
  if (type === "competitive-grinder") return "Rematch. Direkt.";
  if (type === "tour-professional") return "Igen.";
  return "Rematch?";
}

export function getSmartBotResultReaction(input: {
  botId: string;
  botName: string;
  outcome: "player" | "bot";
  category: BotMatchCategory;
  nextStep: BotNextStep;
  targetBotName?: string;
}) {
  const { botId, botName, outcome, category, nextStep, targetBotName } = input;
  const personality = BOT_PERSONALITIES[botId];
  const history = getBotCategoryHistory(botId, category);
  const resultLines = outcome === "player" ? personality?.phrases.playerWin ?? [] : personality?.phrases.botWin ?? [];
  const seed = history.meetings + history.playerWins * 3 + history.botWins * 5;
  const base = pick(resultLines.length ? resultLines : [outcome === "player" ? "Bra spelat." : "Bra match."], seed);
  const lead = historyLead(botName, botId, category);
  const tail = actionTail(botId, nextStep.action, targetBotName);
  return `${lead}${base} ${tail}`.replace(/\s+/g, " ").trim();
}
