import { getBotRelationship } from "@/lib/bot-personality";

export type BotResultReaction = {
  line: string;
  action: "rematch" | "challenge";
  targetBotId?: string;
  actionLabel: string;
};

type Outcome = "player" | "bot";

type ReactionProfile = {
  win: string[];
  loss: string[];
  rematchWin?: string[];
  rematchLoss?: string[];
  challenge?: { targetBotId: string; labels: string[]; after: "win" | "loss" | "either" };
};

const PROFILES: Record<string, ReactionProfile> = {
  margaret: {
    win: ["Där ser du. Man behöver inte slå långt för att vinna. Ska vi ta en till?", "Gamla knep fungerar fortfarande. Revansch?"],
    loss: ["Det där spelade du fint. Nu tycker jag du ska prova Emma också.", "Bra spelat. Emma kommer däremot inte ge dig många gratis hål."],
    challenge: { targetBotId: "emma", after: "loss", labels: ["Utmana Emma", "Spela mot Emma"] },
  },
  leo: {
    win: ["NO WAY 😂 Jag vann! Direkt igen?", "LET'S GO. Okej, rematch innan jag tappar det här."],
    loss: ["Okej den där var sjuk. En till direkt?", "Du tog mig. Men jag vill köra igen NU."],
    rematchWin: ["Två gånger? Okej nu börjar det här bli en grej."],
    rematchLoss: ["Nej nej, jag behöver en till. Jag var nära."],
  },
  sarah: {
    win: ["Nice. Det där var kul. En till?", "Den tar jag. Ingen stress, vi kan köra igen."],
    loss: ["Clean. Du vann. Vill du ha en till eller testa Zach om du vill ha mer snack?", "Bra där. Zach kommer definitivt ha något att säga om det där."],
    challenge: { targetBotId: "zach", after: "loss", labels: ["Utmana Zach", "Testa Zach"] },
  },
  george: {
    win: ["Som väntat. Du gör fortfarande golf svårare än den behöver vara. En till?", "Jaha. Då vann erfarenheten igen. Revansch om du absolut måste."],
    loss: ["Tur. Ren tur. Försök slå Anna också om du nu tror att du kan spela.", "Jo jo, en match. Gå och slå Anna också innan du börjar bli mallig."],
    rematchWin: ["Igen. Kanske dags att börja lyssna på råden nu."],
    rematchLoss: ["Två gånger bevisar fortfarande ingenting. Men gå och testa Anna då."],
    challenge: { targetBotId: "anna", after: "loss", labels: ["Utmana Anna", "Försök slå Anna"] },
  },
  zach: {
    win: ["För enkelt. Du får en chans till om du vill.", "Det där var gratis. Rematch och försök hålla ihop det den här gången."],
    loss: ["Tur. Kör igen så ser vi om du kan göra om det.", "Okej. En gång. Rematch nu."],
    rematchWin: ["Där ja. Ordningen återställd."],
    rematchLoss: ["Okej, nu stör det mig. En till."],
  },
  anna: {
    win: ["Precis. Rätt beslut slår chansningar över tid. Vill du försöka igen?", "Det var strategi, inte tur. En till?"],
    loss: ["Bra. Nu kan du testa Emma och se om det håller mot någon som ger bort ännu mindre.", "Du spelade bra. Emma är nästa logiska test."],
    challenge: { targetBotId: "emma", after: "loss", labels: ["Utmana Emma", "Nästa: Emma"] },
  },
  marcus: {
    win: ["Där ja. Attack vinner. Kör igen.", "Jag visste att den skulle hålla. Rematch."],
    loss: ["Nej. Direkt igen. Jag lämnar inte det där som sista ordet.", "Det där borde varit min match. Rematch. Nu."],
    rematchLoss: ["Okej, NU är jag irriterad. En till."],
  },
  emma: {
    win: ["Fairways, greener, tålamod. Det räcker långt. Vill du spela igen?", "Inga stora misstag. Det var skillnaden."],
    loss: ["Bra golf. Om du vill höja nivån ytterligare är Ryan nästa steg.", "Stabilt. Testa Ryan om du vill se om det håller under mer press."],
    challenge: { targetBotId: "ryan", after: "loss", labels: ["Utmana Ryan", "Nästa nivå: Ryan"] },
  },
  ryan: {
    win: ["Bra match. Men jag stängde den. En till?", "Det är därför man spelar hela vägen. Rematch?"],
    loss: ["Bra. Gör om det. Om du vill ha nästa nivå: Maya.", "Starkt. Nu ser vi om du kan göra samma sak mot Maya."],
    challenge: { targetBotId: "maya", after: "loss", labels: ["Utmana Maya", "Nästa: Maya"] },
  },
  maya: {
    win: ["Bra match. Nästa?", "Kontrollerat. Igen?"],
    loss: ["Bra. Noah nästa.", "Starkt. Testa Noah."],
    challenge: { targetBotId: "noah", after: "loss", labels: ["Utmana Noah", "Nästa: Noah"] },
  },
  noah: {
    win: ["Som väntat. Vill du ha en till?", "Du var nära. Nära räcker inte."],
    loss: ["Bra. Sofia är nästa om du vill veta om det var på riktigt.", "Okej. Testa Sofia nu."],
    challenge: { targetBotId: "sofia", after: "loss", labels: ["Utmana Sofia", "Nästa: Sofia"] },
  },
  sofia: {
    win: ["Kontrollerat. En till?", "Små marginaler. Jag tog dem."],
    loss: ["Starkt. Alex är nästa nivå.", "Bra spelat. Testa Alex."],
    challenge: { targetBotId: "alex", after: "loss", labels: ["Utmana Alex", "Nästa: Alex"] },
  },
  alex: {
    win: ["Bra match. Igen?", "Kontrollerat."],
    loss: ["Starkt. Gör om det.", "Bra. Nu bevisa att det inte var en engångsgrej."],
    rematchLoss: ["Igen."],
  },
};

function pick(lines: string[], seed: number) {
  return lines[Math.abs(seed) % lines.length] ?? lines[0] ?? "Bra match.";
}

export function getBotResultReaction(botId: string, outcome: Outcome): BotResultReaction {
  const profile = PROFILES[botId];
  const relationship = getBotRelationship(botId);
  const seed = relationship.meetings + relationship.playerWins * 3 + relationship.botWins * 5;
  if (!profile) {
    return { line: outcome === "player" ? "Bra spelat. En till?" : "Bra match. Revansch?", action: "rematch", actionLabel: "Rematch" };
  }

  const repeated = relationship.meetings >= 2;
  const lines = outcome === "player"
    ? repeated && profile.rematchLoss?.length ? profile.rematchLoss : profile.loss
    : repeated && profile.rematchWin?.length ? profile.rematchWin : profile.win;

  const challenge = profile.challenge;
  const shouldChallenge = challenge && (challenge.after === "either" || challenge.after === (outcome === "player" ? "loss" : "win"));
  if (shouldChallenge) {
    return {
      line: pick(lines, seed),
      action: "challenge",
      targetBotId: challenge.targetBotId,
      actionLabel: pick(challenge.labels, seed + 1),
    };
  }

  return {
    line: pick(lines, seed),
    action: "rematch",
    actionLabel: outcome === "player" ? "Ge mig en rematch" : "Ta revansch",
  };
}
