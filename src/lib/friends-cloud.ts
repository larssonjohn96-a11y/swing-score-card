import { syncSpeedRounds } from "./speed-cloud";
import {
  speedAverage,
  speedHistoryBaseline,
  parseCourse as parseSpeedCourse,
  courseStorageKey as speedStorageKey,
} from "./speed-course";
import { syncDriverRounds } from "./driver-cloud";
import {
  driverAverage,
  parseCourse as parseDriverCourse,
  courseStorageKey as driverStorageKey,
} from "./driver-course";
import { syncApproachRounds } from "./approach-cloud";
import {
  approachAverage,
  parseCourse as parseApproachCourse,
  courseStorageKey as approachStorageKey,
} from "./approach-course";
import { syncBunkerRounds } from "./bunker-cloud";
import {
  bunkerAverage,
  parseCourse as parseBunkerCourse,
  courseStorageKey as bunkerStorageKey,
} from "./bunker-course";
import { syncPuttRounds } from "./putt-cloud";
import {
  puttAverage,
  parseCourse as parsePuttCourse,
  courseStorageKey as puttStorageKey,
} from "./putt-course";
import { syncChipRounds } from "./chip-cloud";
import { chipAverage } from "./chip-competition";
import { parseCourse, courseStorageKey } from "./chip-course";
/**
 * Riktiga vänner (till skillnad från lib/friends.ts, som är manuellt
 * inskrivna namn+handicap utan koppling till ett konto).
 *
 * Delar bara färdigberäknad spelarprofil – aldrig rå slagdata – och bara
 * med användare man har en ömsesidigt accepterad vänskap med.
 */
import { supabase } from "@/integrations/supabase/client";
import { computeEstimatedHandicap, loadRealHandicap, type CategorySlug } from "@/lib/sg-handicap";
import { computeStableCategoryHandicaps } from "@/lib/category-index";
import { computeRatingCard, type RatingCardData } from "@/lib/rating-card";
import {
  computeLocalSocialRadarProfile,
  type SocialRadarProfile,
} from "@/lib/social-radar-profile";
import {
  computeLocalComparisonProfile,
  parseComparisonProfile,
  type SocialComparisonProfile,
} from "@/lib/social-comparison-profile";

export type Profile = { id: string; displayName: string; avatarUrl: string | null };
export type FriendshipStatus = "pending" | "accepted" | "declined";
export type Friendship = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: string;
  other: Profile;
};
export type PlayerSnapshot = {
  userId: string;
  rating: number;
  tierKey: string;
  realHcp: number | null;
  estHcp: number | null;
  categoryHcp: Partial<Record<CategorySlug, number>>;
  radarProfile: SocialRadarProfile;
  comparisonProfile: SocialComparisonProfile;
  testCount: number;
  updatedAt: string;
};

function parseRadarProfile(value: unknown): SocialRadarProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const next: SocialRadarProfile = {};
  for (const key of ["driving", "approach", "around-the-green", "puttning"] as const) {
    const values = raw[key];
    if (Array.isArray(values)) {
      next[key] = values
        .slice(0, 5)
        .map((value) => (typeof value === "number" && Number.isFinite(value) ? value : 0));
    }
  }
  return next;
}

export async function searchProfiles(query: string, excludeSelf = true): Promise<Profile[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const { data: userData } = await supabase.auth.getUser();
  let q = supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .ilike("display_name", `%${trimmed}%`)
    .limit(20);
  if (excludeSelf && userData.user) q = q.neq("id", userData.user.id);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((p) => ({ id: p.id, displayName: p.display_name, avatarUrl: p.avatar_url }));
}
export async function sendFriendRequest(addresseeId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: userData.user.id, addressee_id: addresseeId });
  return !error;
}
export async function respondToFriendRequest(id: string, accept: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("friendships")
    .update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}
export async function removeFriendship(id: string): Promise<boolean> {
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  return !error;
}

export async function listFriendships(
  strict = false,
): Promise<{ incoming: Friendship[]; outgoing: Friendship[]; accepted: Friendship[] }> {
  const empty = { incoming: [], outgoing: [], accepted: [] };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return empty;
  const uid = userData.user.id;
  const { data: rows, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status, created_at")
    .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);
  if (error && strict) throw error;
  if (error || !rows || !rows.length) return empty;
  const otherIds = [
    ...new Set(rows.map((r) => (r.requester_id === uid ? r.addressee_id : r.requester_id))),
  ];
  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", otherIds);
  if (profileError && strict) throw profileError;
  const profileById = new Map(
    (profileRows ?? []).map((p) => [
      p.id,
      { id: p.id, displayName: p.display_name, avatarUrl: p.avatar_url },
    ]),
  );
  const incoming: Friendship[] = [];
  const outgoing: Friendship[] = [];
  const accepted: Friendship[] = [];
  for (const r of rows) {
    const otherId = r.requester_id === uid ? r.addressee_id : r.requester_id;
    const other = profileById.get(otherId);
    if (!other) continue;
    const friendship: Friendship = {
      id: r.id,
      requesterId: r.requester_id,
      addresseeId: r.addressee_id,
      status: r.status as FriendshipStatus,
      createdAt: r.created_at,
      other,
    };
    if (r.status === "accepted") accepted.push(friendship);
    else if (r.status === "pending" && r.addressee_id === uid) incoming.push(friendship);
    else if (r.status === "pending" && r.requester_id === uid) outgoing.push(friendship);
  }
  return { incoming, outgoing, accepted };
}

export async function pushPlayerSnapshot(expectedUserId?: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user || (expectedUserId && userData.user.id !== expectedUserId)) return false;
  try {
    await syncChipRounds(userData.user.id);
    await syncPuttRounds(userData.user.id);
    await syncBunkerRounds(userData.user.id);
    await syncApproachRounds(userData.user.id);
    await syncDriverRounds(userData.user.id);
    await syncSpeedRounds(userData.user.id);
  } catch {
    return false;
  }
  const { data: currentAuth } = await supabase.auth.getSession();
  if (currentAuth.session?.user.id !== userData.user.id) return false;
  const real = loadRealHandicap();
  const card: RatingCardData = computeRatingCard(real);
  const cats = computeStableCategoryHandicaps(undefined, real ?? undefined);
  const byCat = (slug: CategorySlug) => cats.find((c) => c.slug === slug)?.handicap ?? null;
  const radarProfile = computeLocalSocialRadarProfile();
  const comparisonProfile = computeLocalComparisonProfile();
  const chipHistory = parseCourse(localStorage.getItem(courseStorageKey(userData.user.id))).history;
  const chip = chipAverage(chipHistory);
  const { data: previousChip, error: previousChipError } = await supabase
    .from("player_snapshots")
    .select("comparison_profile")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (previousChipError) return false;
  const previousMetrics = parseComparisonProfile(previousChip?.comparison_profile).training.filter(
    (m) => m.key.startsWith("chip-round-"),
  );
  comparisonProfile.training.push(
    ...(chip.count
      ? [
          {
            key: "chip-round-points",
            label: "Chipprundan · snittpoäng",
            value: chip.points,
            unit: "p",
            decimals: 1,
            higherIsBetter: true,
          },
          {
            key: "chip-round-stars",
            label: "Chipprundan · snittstjärnor",
            value: chip.stars,
            unit: "★",
            decimals: 1,
            higherIsBetter: true,
          },
          {
            key: "chip-round-count",
            label: "Chipprundan · rundor i snittet",
            value: chip.count,
            unit: "",
            decimals: 0,
            higherIsBetter: true,
          },
        ]
      : previousMetrics),
  );
  const putt = puttAverage(
    parsePuttCourse(localStorage.getItem(puttStorageKey(userData.user.id))).history,
  );
  const previousPutt = parseComparisonProfile(previousChip?.comparison_profile).training.filter(
    (m) => m.key.startsWith("putt-round-"),
  );
  comparisonProfile.training.push(
    ...(putt.count
      ? [
          {
            key: "putt-round-stars",
            label: "Puttrundan · snittstjärnor",
            value: putt.stars,
            unit: "★",
            decimals: 1,
            higherIsBetter: true,
          },
          {
            key: "putt-round-count",
            label: "Puttrundan · rundor i snittet",
            value: putt.count,
            unit: "",
            decimals: 0,
            higherIsBetter: true,
          },
        ]
      : previousPutt),
  );
  const bunker = bunkerAverage(
    parseBunkerCourse(localStorage.getItem(bunkerStorageKey(userData.user.id))).history,
  );
  const previousBunker = parseComparisonProfile(previousChip?.comparison_profile).training.filter(
    (m) => m.key.startsWith("bunker-round-"),
  );
  comparisonProfile.training.push(
    ...(bunker.count
      ? [
          {
            key: "bunker-round-stars",
            label: "Bunkerrundan · snittstjärnor",
            value: bunker.stars,
            unit: "★",
            decimals: 1,
            higherIsBetter: true,
          },
          {
            key: "bunker-round-points",
            label: "Bunkerrundan · snittpoäng",
            value: bunker.points,
            unit: "p",
            decimals: 1,
            higherIsBetter: true,
          },
          {
            key: "bunker-round-count",
            label: "Bunkerrundan · rundor i snittet",
            value: bunker.count,
            unit: "",
            decimals: 0,
            higherIsBetter: true,
          },
        ]
      : previousBunker),
  );
  const approach = approachAverage(
    parseApproachCourse(localStorage.getItem(approachStorageKey(userData.user.id))).history,
  );
  const previousApproach = parseComparisonProfile(previousChip?.comparison_profile).training.filter(
    (m) => m.key.startsWith("approach-round-"),
  );
  comparisonProfile.training.push(
    ...(approach.count
      ? [
          {
            key: "approach-round-stars",
            label: "Inspelsrundan · snittstjärnor",
            value: approach.stars,
            unit: "★",
            decimals: 1,
            higherIsBetter: true,
          },
          {
            key: "approach-round-count",
            label: "Inspelsrundan · rundor i snittet",
            value: approach.count,
            unit: "",
            decimals: 0,
            higherIsBetter: true,
          },
        ]
      : previousApproach),
  );
  const driver = driverAverage(
    parseDriverCourse(localStorage.getItem(driverStorageKey(userData.user.id))).history,
  );
  const previousDriver = parseComparisonProfile(previousChip?.comparison_profile).training.filter(
    (m) => m.key.startsWith("driver-round-"),
  );
  comparisonProfile.training.push(
    ...(driver.count
      ? [
          {
            key: "driver-round-points",
            label: "Driverrundan · snittpoäng",
            value: driver.points,
            unit: "p",
            decimals: 1,
            higherIsBetter: true,
          },
          {
            key: "driver-round-count",
            label: "Driverrundan · rundor i snittet",
            value: driver.count,
            unit: "",
            decimals: 0,
            higherIsBetter: true,
          },
        ]
      : previousDriver),
  );
  const speed = speedAverage(
    parseSpeedCourse(localStorage.getItem(speedStorageKey(userData.user.id))).history,
  );
  const speedBaseline = speedHistoryBaseline(
    parseSpeedCourse(localStorage.getItem(speedStorageKey(userData.user.id))).history,
  );
  const previousSpeed = parseComparisonProfile(previousChip?.comparison_profile).training.filter(
    (m) => m.key.startsWith("speed-round-"),
  );
  comparisonProfile.training.push(
    ...(speed.count
      ? [
          {
            key: "speed-round-points",
            label: "Speedrundan · snittpoäng",
            value: speed.points,
            unit: "p",
            decimals: 1,
            higherIsBetter: true,
          },
          {
            key: "speed-round-count",
            label: "Speedrundan · rundor i snittet",
            value: speed.count,
            unit: "",
            decimals: 0,
            higherIsBetter: true,
          },
        ]
      : previousSpeed),
  );
  if (speedBaseline.count)
    comparisonProfile.training.push(
      {
        key: "speed-round-best-mph",
        label: "Ball Speed Challenge · personbästa",
        value: speedBaseline.pb!,
        unit: "mph",
        decimals: 1,
        higherIsBetter: true,
      },
      {
        key: "speed-round-average-mph",
        label: "Ball Speed Challenge · snitt",
        value: speedBaseline.average!,
        unit: "mph",
        decimals: 1,
        higherIsBetter: true,
      },
    );
  const { error } = await (supabase.from("player_snapshots") as any).upsert({
    user_id: userData.user.id,
    rating: card.rating,
    tier_key: card.tier.key,
    real_hcp: real,
    est_hcp: computeEstimatedHandicap(cats) ?? null,
    approach_hcp: byCat("approach"),
    driving_hcp: byCat("driving"),
    around_green_hcp: byCat("around-the-green"),
    putting_hcp: byCat("puttning"),
    speed_hcp: byCat("speed"),
    radar_profile: radarProfile as any,
    comparison_profile: comparisonProfile as any,
    test_count: cats.reduce((sum, c) => sum + c.count, 0),
    updated_at: new Date().toISOString(),
  });
  return !error;
}

function mapSnapshot(d: any): PlayerSnapshot {
  return {
    userId: d.user_id,
    rating: d.rating,
    tierKey: d.tier_key,
    realHcp: d.real_hcp,
    estHcp: d.est_hcp,
    categoryHcp: {
      approach: d.approach_hcp ?? undefined,
      driving: d.driving_hcp ?? undefined,
      "around-the-green": d.around_green_hcp ?? undefined,
      puttning: d.putting_hcp ?? undefined,
      speed: d.speed_hcp ?? undefined,
    },
    radarProfile: parseRadarProfile(d.radar_profile),
    comparisonProfile: parseComparisonProfile(d.comparison_profile),
    testCount: d.test_count,
    updatedAt: d.updated_at,
  };
}

export async function listPublicSnapshots(): Promise<
  (PlayerSnapshot & { displayName: string; avatarUrl: string | null })[]
> {
  const { data, error } = await supabase
    .from("player_snapshots")
    .select("*, profiles!inner(display_name, avatar_url)")
    .eq("is_public", true);
  if (error || !data) return [];
  return data.map((d) => ({
    ...mapSnapshot(d), // @ts-expect-error joined relation
    displayName: d.profiles?.display_name ?? "Okänd", // @ts-expect-error joined relation
    avatarUrl: d.profiles?.avatar_url ?? null,
  }));
}
export async function setOwnSnapshotPublic(isPublic: boolean): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  const { error } = await supabase
    .from("player_snapshots")
    .update({ is_public: isPublic })
    .eq("user_id", userData.user.id);
  return !error;
}
export async function fetchFriendSnapshot(
  userId: string,
  strict = false,
): Promise<PlayerSnapshot | null> {
  const { data, error } = await supabase
    .from("player_snapshots")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error && strict) throw error;
  if (error || !data) return null;
  return mapSnapshot(data);
}
