export type BotSocialType =
  | "grumpy-old-guy"
  | "trash-talker"
  | "laid-back"
  | "know-it-all"
  | "silent-killer"
  | "friendly-veteran"
  | "excuse-machine"
  | "hype-player"
  | "hothead"
  | "golf-purist"
  | "competitive-grinder"
  | "tour-professional";

export type BotPersonality = {
  type: BotSocialType;
  label: string;
  oneLiner: string;
  talkRate: number;
  praiseRate: number;
  correctionRate: number;
  tiltRate: number;
  trashTalk: number;
  memory: string;
  phrases: {
    start: string[];
    botWin: string[];
    playerWin: string[];
    tie: string[];
    pressure: string[];
    playerBad: string[];
    botBad: string[];
    rematch: string[];
  };
};

export type BotRelationship = {
  meetings: number;
  playerWins: number;
  botWins: number;
  ties: number;
  lastWinner?: "player" | "bot" | "tie";
};

const STORE_KEY = "sg4-bot-relationships-v1";

export const BOT_PERSONALITIES: Record<string, BotPersonality> = {
  margaret: {
    type: "friendly-veteran", label: "Klubbmormorn", oneLiner: "Varm, erfaren och lite för nöjd när gamla knep fortfarande fungerar.",
    talkRate: .78, praiseRate: .9, correctionRate: .15, tiltRate: .05, trashTalk: .05, memory: "Minns fina slag och tidigare jämna matcher.",
    phrases: {
      start: ["Nu tar vi det lugnt och spelar golf.", "Kom ihåg: rytm först, resultat sen."],
      botWin: ["Man behöver inte slå längst för att vinna hål.", "Där satt den gamla skolans metod igen."],
      playerWin: ["Åh, den var riktigt fin.", "Det där hade min gamle tränare gillat."],
      tie: ["Delat är rättvist där.", "Jämnt och trevligt."],
      pressure: ["Nu gäller det bara att andas och slå sitt slag."],
      playerBad: ["Glöm den där. Nästa slag är det enda som räknas."],
      botBad: ["Jaha ja, även gamla hundar missar ibland."],
      rematch: ["En till? Absolut, jag har kaffe kvar."],
    },
  },
  leo: {
    type: "hype-player", label: "Hype-killen", oneLiner: "Nybörjaren som firar varje bra slag som om han vunnit Ryder Cup.",
    talkRate: .92, praiseRate: .85, correctionRate: .02, tiltRate: .18, trashTalk: .12, memory: "Minns sjuka slag mer än resultatet.",
    phrases: {
      start: ["OKEJ NU KÖR VI 😤", "Det här kan bli min bästa match någonsin."],
      botWin: ["NO WAY, den satt ju!", "LET'S GO!"],
      playerWin: ["Okej den där var sjuk.", "Bro, vad var DET där för slag?"],
      tie: ["Haha exakt lika, perfekt."],
      pressure: ["Okej okej, nu blev det faktiskt nervöst."],
      playerBad: ["Aj. Vi låtsas att ingen såg den."],
      botBad: ["HAHA nej nej nej, radera det där slaget."],
      rematch: ["JA. Direkt igen."],
    },
  },
  sarah: {
    type: "laid-back", label: "Laid-back regular", oneLiner: "Helggolfaren som aldrig verkar stressad och alltid tar nästa slag som det kommer.",
    talkRate: .55, praiseRate: .7, correctionRate: .03, tiltRate: .08, trashTalk: .05, memory: "Minns om matcherna brukar bli jämna.",
    phrases: {
      start: ["All good. Vi kör.", "Ingen stress, bara golf."],
      botWin: ["Nice, den tar jag.", "Det där funkade ju."],
      playerWin: ["Bra där.", "Clean."],
      tie: ["Fair enough."],
      pressure: ["Okej, nu betyder den här faktiskt något."],
      playerBad: ["Shake it off."],
      botBad: ["Haha, klassisk helggolf."],
      rematch: ["Sure. En till."],
    },
  },
  george: {
    type: "grumpy-old-guy", label: "Grumpy old guy", oneLiner: "Old-school klubbveteranen som tillrättavisar allt från klubbval till tempo och nästan alltid låter lite irriterad.",
    talkRate: .9, praiseRate: .08, correctionRate: .96, tiltRate: .54, trashTalk: .42, memory: "Minns dina dåliga beslut och påminner dig gärna om dem nästa gång.",
    phrases: {
      start: ["Jaha. Då ska vi se om det blir golf eller bara svingande idag.", "Försök hålla tempot nu. Vi har inte hela dagen."],
      botWin: ["Precis. Man behöver inte göra det svårare än det är.", "Det där lärde man sig innan folk började filma varje sving."],
      playerWin: ["Jo jo. En blind höna hittar också ett korn.", "Det där var faktiskt okej. Bli inte för nöjd nu."],
      tie: ["Delat. Kunde varit bättre från båda."],
      pressure: ["Nu får vi se om du kan slå när det faktiskt gäller."],
      playerBad: ["Vad var det där? Du försöker ju hjälpa bollen.", "Alldeles för bråttom. Jag sa ju det."],
      botBad: ["Mattan tog den. Sånt där händer inte på riktigt gräs.", "Hmpf. Dålig studs."],
      rematch: ["En till då. Och den här gången: tänk innan du slår."],
    },
  },
  zach: {
    type: "trash-talker", label: "Trash talkern", oneLiner: "Slår hårt, pratar ännu större och älskar att påminna dig om senaste missen.",
    talkRate: .88, praiseRate: .2, correctionRate: .08, tiltRate: .42, trashTalk: .95, memory: "Håller koll på vem som leder rivaliteten.",
    phrases: {
      start: ["Hoppas du värmde upp. Du kommer behöva det.", "Jag tänker inte spela defensivt idag."],
      botWin: ["För enkelt.", "Du gav mig det där hålet gratis."],
      playerWin: ["Okej. Njut av den medan du kan.", "Bra slag. Gör om det då."],
      tie: ["Delat? Jag tar nästa."],
      pressure: ["Känner du pressen nu eller?", "Det här är hålet du kommer tänka på efteråt."],
      playerBad: ["Aj. Den där kommer sitta kvar i huvudet.", "Vill du ha en mulligan? Nej just det."],
      botBad: ["Okej, den bjuder jag på. En gång."],
      rematch: ["Bra. Jag var inte klar."],
    },
  },
  anna: {
    type: "know-it-all", label: "Klubbexperten", oneLiner: "Har ett råd om varje klubbval, linje och beslut – även när ingen frågat.",
    talkRate: .76, praiseRate: .42, correctionRate: .9, tiltRate: .12, trashTalk: .2, memory: "Minns dina återkommande misstag och kommenterar dem.",
    phrases: {
      start: ["Vi får se om du väljer rätt strategi idag.", "Det här handlar mer om beslut än om perfekta slag."],
      botWin: ["Precis. Spela procenten så kommer hålen.", "Det är därför man inte behöver jaga flaggan."],
      playerWin: ["Bra slag. Lite aggressivt kanske, men det gick ju."],
      tie: ["Rimligt utfall från de positionerna."],
      pressure: ["Nu är klubbvalet viktigare än själva svingen."],
      playerBad: ["Du försökte göra för mycket där.", "Det där var fel beslut redan innan du slog."],
      botBad: ["Rätt beslut, dålig execution. Det händer."],
      rematch: ["Okej. Den här gången tänk ett slag framåt."],
    },
  },
  marcus: {
    type: "hothead", label: "Hothead", oneLiner: "Aggressiv pin hunter som blir märkbart mer frustrerad när marginalerna går emot honom.",
    talkRate: .82, praiseRate: .28, correctionRate: .18, tiltRate: .86, trashTalk: .58, memory: "Minns förluster och vill snabbt ha revansch.",
    phrases: {
      start: ["Jag går för allt idag.", "Inga layups. Nu kör vi."],
      botWin: ["Där ja!", "Exakt. Attack."],
      playerWin: ["Seriöst? Okej.", "Fine. Nästa."],
      tie: ["Det där borde varit mitt hål."],
      pressure: ["Bra. Nu avgör vi det här."],
      playerBad: ["Där öppnade du dörren."],
      botBad: ["Nej! Vad håller jag på med?", "Det där är så dåligt."],
      rematch: ["Direkt. Jag tänker inte lämna det där som sista ordet."],
    },
  },
  emma: {
    type: "golf-purist", label: "Golfpuristen", oneLiner: "Metodisk singelhandicapare som tror på fairways, tempo och att golf ska spelas korrekt.",
    talkRate: .48, praiseRate: .55, correctionRate: .38, tiltRate: .06, trashTalk: .04, memory: "Minns smarta beslut mer än spektakulära slag.",
    phrases: {
      start: ["Fairway, green, två puttar. Det räcker långt."],
      botWin: ["Inga konstigheter. Bara rätt spel."],
      playerWin: ["Bra golfslag."],
      tie: ["Bra hål från båda."],
      pressure: ["Samma rutin som alltid."],
      playerBad: ["Du behöver inte forcera varje slag."],
      botBad: ["Dålig kontakt. Nästa."],
      rematch: ["Gärna. Samma principer igen."],
    },
  },
  ryan: {
    type: "competitive-grinder", label: "College grindern", oneLiner: "Tävlingsspelaren som aldrig släpper ett hål och behandlar varje match som kval.",
    talkRate: .5, praiseRate: .3, correctionRate: .1, tiltRate: .16, trashTalk: .24, memory: "Minns matchscore och revanschläge.",
    phrases: {
      start: ["Första slaget till sista. Fullt fokus."],
      botWin: ["Ett hål. Fortsätt."],
      playerWin: ["Bra. Nästa."],
      tie: ["Ingen separation."],
      pressure: ["Det här är exakt läget man tränar för."],
      playerBad: ["Du får inte många sådana chanser tillbaka."],
      botBad: ["Dålig execution. Reset."],
      rematch: ["Ja. Kör."],
    },
  },
  maya: {
    type: "silent-killer", label: "Silent killer", oneLiner: "Säger nästan ingenting, visar nästan ingenting och ger bort ännu mindre.",
    talkRate: .2, praiseRate: .14, correctionRate: .02, tiltRate: .02, trashTalk: .02, memory: "Minns resultat, men pratar inte om dem i onödan.",
    phrases: {
      start: ["Kör."], botWin: ["Nästa."], playerWin: ["Bra."], tie: ["Delat."], pressure: ["Fokus."], playerBad: ["Nästa."], botBad: ["Reset."], rematch: ["Ja."],
    },
  },
  noah: {
    type: "trash-talker", label: "College-killern", oneLiner: "Elitspelaren som är iskall nog att trash-talka utan att själv tappa fokus.",
    talkRate: .64, praiseRate: .12, correctionRate: .04, tiltRate: .05, trashTalk: .74, memory: "Minns exakt vem som vann sist.",
    phrases: {
      start: ["Du behöver spela bra idag."], botWin: ["Som väntat."], playerWin: ["Bra. Nu gör det igen."], tie: ["Fortfarande inget."], pressure: ["Nu ser vi vad du har."], playerBad: ["Det där är skillnaden."], botBad: ["En miss. Inte två."], rematch: ["Absolut."],
    },
  },
  sofia: {
    type: "tour-professional", label: "Tour-proffset", oneLiner: "Professionell, exakt och nästan obehagligt lugn när matchen drar ihop sig.",
    talkRate: .38, praiseRate: .32, correctionRate: .08, tiltRate: .01, trashTalk: .03, memory: "Minns starka prestationer och avgörande hål.",
    phrases: {
      start: ["Små marginaler idag."], botWin: ["Kontrollerat."], playerWin: ["Starkt slag."], tie: ["Vi fortsätter."], pressure: ["Exekvera."], playerBad: ["Det räcker med en miss på den här nivån."], botBad: ["Dålig execution."], rematch: ["Gärna."],
    },
  },
  alex: {
    type: "tour-professional", label: "Tour veteran", oneLiner: "Komplett, kortfattad och totalt oberörd av score eller momentum.",
    talkRate: .24, praiseRate: .18, correctionRate: .04, tiltRate: 0, trashTalk: 0, memory: "Minns rivaliteten men låter spelet tala.",
    phrases: {
      start: ["Spela ditt spel."], botWin: ["Bra."], playerWin: ["Starkt."], tie: ["Vidare."], pressure: ["Samma rutin."], playerBad: ["Reset."], botBad: ["Nästa."], rematch: ["Kör."],
    },
  },
};

function readAll(): Record<string, BotRelationship> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}"); } catch { return {}; }
}

export function getBotRelationship(botId: string): BotRelationship {
  return readAll()[botId] ?? { meetings: 0, playerWins: 0, botWins: 0, ties: 0 };
}

export function recordBotMatch(botId: string, winner: "player" | "bot" | "tie") {
  if (typeof window === "undefined") return;
  const all = readAll();
  const current = getBotRelationship(botId);
  const next = {
    ...current,
    meetings: current.meetings + 1,
    playerWins: current.playerWins + (winner === "player" ? 1 : 0),
    botWins: current.botWins + (winner === "bot" ? 1 : 0),
    ties: current.ties + (winner === "tie" ? 1 : 0),
    lastWinner: winner,
  };
  all[botId] = next;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(all));
}

export function relationshipLine(botId: string, botName: string) {
  const r = getBotRelationship(botId);
  if (!r.meetings) return null;
  if (r.playerWins >= 2 && r.playerWins > r.botWins) return `${botName} vet att du leder rivaliteten ${r.playerWins}–${r.botWins}.`;
  if (r.botWins >= 2 && r.botWins > r.playerWins) return `${botName} leder rivaliteten ${r.botWins}–${r.playerWins}.`;
  if (r.meetings >= 2) return `Ni har mötts ${r.meetings} gånger.`;
  return null;
}

export function personalityLine(
  botId: string,
  event: "start" | "bot-win" | "player-win" | "tie" | "pressure" | "player-bad" | "bot-bad" | "rematch",
  random = Math.random,
) {
  const p = BOT_PERSONALITIES[botId];
  if (!p) return null;
  if (event !== "start" && event !== "pressure" && random() > p.talkRate) return null;
  const key = event === "bot-win" ? "botWin" : event === "player-win" ? "playerWin" : event === "player-bad" ? "playerBad" : event === "bot-bad" ? "botBad" : event;
  const lines = p.phrases[key as keyof BotPersonality["phrases"]];
  if (!lines?.length) return null;
  return lines[Math.floor(random() * lines.length)] ?? lines[0];
}
