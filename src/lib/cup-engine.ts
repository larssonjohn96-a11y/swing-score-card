export type CupRound = "quarterfinal" | "semifinal" | "final";
export type CupStatus = "active" | "won" | "eliminated";

export type CupParticipant = {
  id: string;
  name: string;
  hcp?: number;
  avatar: string;
  player?: boolean;
};

export type CupMatch = {
  id: string;
  round: CupRound;
  slot: number;
  a?: CupParticipant;
  b?: CupParticipant;
  winnerId?: string;
};

export type CupState = {
  version: 1;
  id: string;
  name: string;
  level: string;
  status: CupStatus;
  createdAt: string;
  matches: CupMatch[];
  currentRound: CupRound;
  category: "putting" | "around-the-green" | "approach" | "off-the-tee";
  matchLength: 5;
};

const STORE_KEY = "sg4-club-cup-v1";
const ACTIVE_MATCH_KEY = "sg4-active-cup-match-v1";

const PLAYER: CupParticipant = { id: "player", name: "Du", avatar: "⛳", player: true };
const FIELD: CupParticipant[] = [
  { id: "sarah", name: "Sarah", hcp: 27, avatar: "👩🏼" },
  { id: "george", name: "George", hcp: 24, avatar: "👴🏻" },
  { id: "zach", name: "Zach", hcp: 22, avatar: "🧔🏻" },
  { id: "anna", name: "Anna", hcp: 16, avatar: "👩🏻" },
  { id: "marcus", name: "Marcus", hcp: 11, avatar: "👨🏽" },
  { id: "emma", name: "Emma", hcp: 7, avatar: "👩🏼‍🦱" },
  { id: "leo", name: "Leo", hcp: 34, avatar: "🧑🏻" },
];

function hasStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function strength(participant: CupParticipant) {
  if (participant.player) return 20;
  return participant.hcp ?? 20;
}

function botWinner(a: CupParticipant, b: CupParticipant) {
  const aHcp = strength(a);
  const bHcp = strength(b);
  const better = aHcp <= bHcp ? a : b;
  const underdog = better.id === a.id ? b : a;
  const gap = Math.abs(aHcp - bHcp);
  const upsetChance = Math.max(0.12, 0.34 - gap * 0.018);
  return Math.random() < upsetChance ? underdog : better;
}

function makeMatch(id: string, round: CupRound, slot: number, a?: CupParticipant, b?: CupParticipant): CupMatch {
  return { id, round, slot, a, b };
}

export function createClubCup(): CupState {
  const participants = [PLAYER, ...FIELD];
  const qf: CupMatch[] = [
    makeMatch("qf-1", "quarterfinal", 0, participants[0], participants[1]),
    makeMatch("qf-2", "quarterfinal", 1, participants[2], participants[3]),
    makeMatch("qf-3", "quarterfinal", 2, participants[4], participants[5]),
    makeMatch("qf-4", "quarterfinal", 3, participants[6], participants[7]),
  ];

  for (const match of qf) {
    if (!match.a?.player && !match.b?.player && match.a && match.b) match.winnerId = botWinner(match.a, match.b).id;
  }

  const state: CupState = {
    version: 1,
    id: "club-cup-20",
    name: "Club Cup",
    level: "HCP 20",
    status: "active",
    createdAt: new Date().toISOString(),
    currentRound: "quarterfinal",
    category: "putting",
    matchLength: 5,
    matches: [...qf, makeMatch("sf-1", "semifinal", 0), makeMatch("sf-2", "semifinal", 1), makeMatch("f-1", "final", 0)],
  };
  return advanceCup(state);
}

function participantForWinner(state: CupState, match: CupMatch) {
  if (!match.winnerId) return undefined;
  return [match.a, match.b].find((participant) => participant?.id === match.winnerId);
}

export function advanceCup(input: CupState): CupState {
  const state: CupState = { ...input, matches: input.matches.map((match) => ({ ...match })) };
  const qf = state.matches.filter((m) => m.round === "quarterfinal").sort((a, b) => a.slot - b.slot);
  const sf = state.matches.filter((m) => m.round === "semifinal").sort((a, b) => a.slot - b.slot);
  const final = state.matches.find((m) => m.round === "final");

  if (qf.every((m) => !!m.winnerId)) {
    sf[0].a = participantForWinner(state, qf[0]); sf[0].b = participantForWinner(state, qf[1]);
    sf[1].a = participantForWinner(state, qf[2]); sf[1].b = participantForWinner(state, qf[3]);
    for (const match of sf) {
      if (!match.winnerId && match.a && match.b && !match.a.player && !match.b.player) match.winnerId = botWinner(match.a, match.b).id;
    }
    state.currentRound = "semifinal";
  }

  if (sf.every((m) => !!m.winnerId) && final) {
    final.a = participantForWinner(state, sf[0]); final.b = participantForWinner(state, sf[1]);
    if (!final.winnerId && final.a && final.b && !final.a.player && !final.b.player) final.winnerId = botWinner(final.a, final.b).id;
    state.currentRound = "final";
  }

  if (final?.winnerId) {
    state.status = final.winnerId === "player" ? "won" : "eliminated";
  } else {
    const playedPlayerMatch = state.matches.find((m) => m.winnerId && (m.a?.player || m.b?.player) && m.winnerId !== "player");
    if (playedPlayerMatch) state.status = "eliminated";
  }
  return state;
}

export function loadClubCup(): CupState | null {
  if (!hasStorage()) return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORE_KEY) || "null") as CupState | null;
    return parsed?.version === 1 ? advanceCup(parsed) : null;
  } catch {
    return null;
  }
}

export function saveClubCup(state: CupState) {
  if (!hasStorage()) return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

export function resetClubCup() {
  if (!hasStorage()) return;
  window.localStorage.removeItem(STORE_KEY);
  window.localStorage.removeItem(ACTIVE_MATCH_KEY);
}

export function getPlayerCupMatch(state: CupState) {
  return state.matches.find((match) => !match.winnerId && match.a && match.b && (match.a.player || match.b.player));
}

export function startActiveCupMatch(state: CupState) {
  if (!hasStorage()) return null;
  const match = getPlayerCupMatch(state);
  if (!match) return null;
  const opponent = match.a?.player ? match.b : match.a;
  if (!opponent) return null;
  const active = { cupId: state.id, matchId: match.id, botId: opponent.id, round: match.round, category: state.category, matchLength: state.matchLength };
  window.localStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify(active));
  return active;
}

export function getActiveCupMatch(): { cupId: string; matchId: string; botId: string; round: CupRound; category: CupState["category"]; matchLength: 5 } | null {
  // Bot play should always open the bot picker. Clear any stale Cup state so an
  // old Putting Cup can never hijack the normal "Spela mot bot" flow.
  if (hasStorage()) window.localStorage.removeItem(ACTIVE_MATCH_KEY);
  return null;
}

export function clearActiveCupMatch() {
  if (hasStorage()) window.localStorage.removeItem(ACTIVE_MATCH_KEY);
}

export function recordActiveCupResult(botId: string, winner: "player" | "bot") {
  const active = getActiveCupMatch();
  const current = loadClubCup();
  if (!active || !current || active.cupId !== current.id || active.botId !== botId) return null;
  const matches = current.matches.map((match) => match.id === active.matchId ? { ...match, winnerId: winner === "player" ? "player" : botId } : match);
  const next = advanceCup({ ...current, matches });
  saveClubCup(next);
  clearActiveCupMatch();
  return next;
}

export function cupRoundLabel(round: CupRound) {
  if (round === "quarterfinal") return "Kvartsfinal";
  if (round === "semifinal") return "Semifinal";
  return "Final";
}
