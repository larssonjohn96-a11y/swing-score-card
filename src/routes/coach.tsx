import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Target,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useHideBottomNav } from "@/lib/bottom-nav-visibility";

export const Route = createFileRoute("/coach")({ component: CoachPage });

const db = supabase as any;
type CoachView = "overview" | "players" | "player-profile" | "focus-editor" | "groups" | "group-profile" | "group-focus-editor" | "progress" | "more";
type CoachProfile = { user_id: string; display_name: string; club_name: string | null; invite_code: string };
type Relationship = { id: string; player_id: string; coach_id: string; status: string; share_training_data: boolean; created_at?: string };
type TrainingSession = { id: string; test_id: string; category: string; played_at: string; score: number | null; test_handicap: number | null; metrics: Record<string, unknown> | null };
type PlayerRow = {
  relationship: Relationship;
  name: string;
  gender?: string | null;
  clubName?: string | null;
  snapshot?: { est_hcp?: number | null; test_count?: number };
};
type FocusBlock = {
  id: string;
  relationship_id: string;
  player_id: string;
  coach_id: string;
  primary_focus: string;
  secondary_focus: string | null;
  why_text: string | null;
  coach_note: string | null;
  recommendations: string[];
  start_date: string;
  end_date: string;
  status: "active" | "completed" | "extended";
  extended_from: string | null;
  created_at: string;
};
type CoachGroup = { id: string; coach_id: string; name: string; description: string | null; created_at: string };
type GroupMember = { group_id: string; relationship_id: string; player_id: string; created_at: string };
type GroupFocusBlock = {
  id: string;
  group_id: string;
  coach_id: string;
  primary_focus: string;
  secondary_focus: string | null;
  why_text: string | null;
  coach_note: string | null;
  recommendations: string[];
  start_date: string;
  end_date: string;
  status: "active" | "completed" | "extended";
  extended_from: string | null;
  created_at: string;
};

const DEMO_PLAYERS: PlayerRow[] = [
  { relationship: { id: "demo-rel-emma", player_id: "demo-emma", coach_id: "demo-john", status: "accepted", share_training_data: true, created_at: "2026-03-18T12:00:00Z" }, name: "Emma", gender: "Kvinna", clubName: "Jönköpings GK", snapshot: { est_hcp: 18.4, test_count: 14 } },
  { relationship: { id: "demo-rel-oskar", player_id: "demo-oskar", coach_id: "demo-john", status: "accepted", share_training_data: true, created_at: "2026-01-22T12:00:00Z" }, name: "Oskar", gender: "Man", clubName: "A6 Golfklubb", snapshot: { est_hcp: 9.7, test_count: 23 } },
  { relationship: { id: "demo-rel-sara", player_id: "demo-sara", coach_id: "demo-john", status: "accepted", share_training_data: true, created_at: "2026-06-02T12:00:00Z" }, name: "Sara", gender: "Kvinna", clubName: "Jönköpings GK", snapshot: { est_hcp: 27.1, test_count: 8 } },
];

const DEMO_SESSIONS: Record<string, TrainingSession[]> = {
  "demo-emma": [
    { id: "demo-session-emma-1", test_id: "approach-precision", category: "approach", played_at: "2026-09-12T14:30:00Z", score: 72, test_handicap: 17.8, metrics: null },
    { id: "demo-session-emma-2", test_id: "fairway-streak", category: "driving", played_at: "2026-07-10T16:10:00Z", score: 7, test_handicap: 22.1, metrics: null },
  ],
  "demo-oskar": [
    { id: "demo-session-oskar-1", test_id: "driver-konsekvens", category: "driving", played_at: "2026-09-11T17:20:00Z", score: 81, test_handicap: 8.9, metrics: null },
    { id: "demo-session-oskar-2", test_id: "lagputt-ladder", category: "puttning", played_at: "2026-04-09T15:00:00Z", score: 15, test_handicap: 11.8, metrics: null },
  ],
  "demo-sara": [
    { id: "demo-session-sara-1", test_id: "8-bollar", category: "around-the-green", played_at: "2026-09-12T09:45:00Z", score: 11, test_handicap: 25.9, metrics: null },
    { id: "demo-session-sara-2", test_id: "approach-precision", category: "approach", played_at: "2026-06-18T09:45:00Z", score: 48, test_handicap: 30.2, metrics: null },
  ],
};

const DEMO_BLOCKS: FocusBlock[] = [
  { id: "demo-block-emma-2", relationship_id: "demo-rel-emma", player_id: "demo-emma", coach_id: "demo-john", primary_focus: "Around the Green", secondary_focus: "Putting", why_text: "Få jämnare kontakt och bättre längdkontroll runt green.", coach_note: "Tänk på händerna framför bollen när du chippar.", recommendations: ["8-bollar", "Upp & in", "Around the Green HCP-test"], start_date: "2026-09-02", end_date: "2026-10-14", status: "active", extended_from: null, created_at: "2026-09-02T10:00:00Z" },
  { id: "demo-block-emma-1", relationship_id: "demo-rel-emma", player_id: "demo-emma", coach_id: "demo-john", primary_focus: "Approach 100–150 m", secondary_focus: null, why_text: "Stabilare startlinje och längdkontroll.", coach_note: "Prioritera rytm framför fart.", recommendations: ["Approach Precision", "Random Approach"], start_date: "2026-07-01", end_date: "2026-08-20", status: "completed", extended_from: null, created_at: "2026-07-01T10:00:00Z" },
  { id: "demo-block-oskar-1", relationship_id: "demo-rel-oskar", player_id: "demo-oskar", coach_id: "demo-john", primary_focus: "Off the Tee", secondary_focus: "Speed", why_text: "Behåll bollhastigheten men minska spridningen.", coach_note: "Låt tempot styra. Jaga inte extra fart i varje slag.", recommendations: ["Driver med konsekvens", "Fairway Streak"], start_date: "2026-08-25", end_date: "2026-10-06", status: "active", extended_from: null, created_at: "2026-08-25T10:00:00Z" },
  { id: "demo-block-sara-1", relationship_id: "demo-rel-sara", player_id: "demo-sara", coach_id: "demo-john", primary_focus: "Putting", secondary_focus: "Around the Green", why_text: "Bygg trygghet från korta avstånd och runt green.", coach_note: "Håll samma rutin på varje putt.", recommendations: ["Klock-putt", "Putting Streak", "8-bollar"], start_date: "2026-08-12", end_date: "2026-09-23", status: "active", extended_from: null, created_at: "2026-08-12T10:00:00Z" },
];

const DEMO_GROUPS: CoachGroup[] = [
  { id: "demo-group-junior", coach_id: "demo-john", name: "Juniorgrupp", description: "Gemensam utvecklingsgrupp", created_at: "2026-08-15T10:00:00Z" },
  { id: "demo-group-winter", coach_id: "demo-john", name: "Vinterträning", description: "Träning under inomhussäsongen", created_at: "2026-09-01T10:00:00Z" },
];
const DEMO_GROUP_MEMBERS: GroupMember[] = [
  { group_id: "demo-group-junior", relationship_id: "demo-rel-emma", player_id: "demo-emma", created_at: "2026-08-15T10:00:00Z" },
  { group_id: "demo-group-junior", relationship_id: "demo-rel-sara", player_id: "demo-sara", created_at: "2026-08-15T10:00:00Z" },
  { group_id: "demo-group-winter", relationship_id: "demo-rel-emma", player_id: "demo-emma", created_at: "2026-09-01T10:00:00Z" },
  { group_id: "demo-group-winter", relationship_id: "demo-rel-oskar", player_id: "demo-oskar", created_at: "2026-09-01T10:00:00Z" },
];
const DEMO_GROUP_BLOCKS: GroupFocusBlock[] = [
  { id: "demo-group-block-junior", group_id: "demo-group-junior", coach_id: "demo-john", primary_focus: "Putting", secondary_focus: "Around the Green", why_text: "Bygg en stabil rutin och bättre känsla runt green.", coach_note: "Samma rutin före varje slag.", recommendations: ["Klock-putt", "8-bollar"], start_date: "2026-09-01", end_date: "2026-10-12", status: "active", extended_from: null, created_at: "2026-09-01T10:00:00Z" },
];

const glass = "border border-slate-200/95 bg-white/96 shadow-[0_18px_42px_-24px_rgba(30,41,59,.28),0_2px_8px_-4px_rgba(30,41,59,.16),inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-[22px] dark:border-white/12 dark:bg-white/[0.10]";

function CoachPage() {
  useHideBottomNav(true);
  const { user, displayName, loading } = useAuth();
  const isJohnMaster = (displayName ?? "").trim().toLowerCase() === "john";
  const [view, setView] = useState<CoachView>("overview");
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [sessions, setSessions] = useState<Record<string, TrainingSession[]>>({});
  const [focusBlocks, setFocusBlocks] = useState<FocusBlock[]>([]);
  const [groups, setGroups] = useState<CoachGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupFocusBlocks, setGroupFocusBlocks] = useState<GroupFocusBlock[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const hasRealCoachStudents = players.some((player) => player.relationship.id !== "preview-self-john");
  const useDemo = isJohnMaster && !hasRealCoachStudents;
  const visiblePlayers = useDemo ? [...players, ...DEMO_PLAYERS] : players;
  const visibleSessions = useDemo ? { ...DEMO_SESSIONS, ...sessions } : sessions;
  const visibleBlocks = useDemo ? [...focusBlocks, ...DEMO_BLOCKS] : focusBlocks;
  const visibleGroups = useDemo ? [...groups, ...DEMO_GROUPS] : groups;
  const visibleGroupMembers = useDemo ? [...groupMembers, ...DEMO_GROUP_MEMBERS] : groupMembers;
  const visibleGroupBlocks = useDemo ? [...groupFocusBlocks, ...DEMO_GROUP_BLOCKS] : groupFocusBlocks;
  const effectiveProfile = profile ?? (isJohnMaster ? { user_id: user?.id ?? "demo-john", display_name: "Coach John", club_name: null, invite_code: "JOHN" } : null);
  const selectedPlayer = useMemo(() => visiblePlayers.find((p) => p.relationship.player_id === selectedPlayerId) ?? null, [visiblePlayers, selectedPlayerId]);
  const selectedGroup = useMemo(() => visibleGroups.find((g) => g.id === selectedGroupId) ?? null, [visibleGroups, selectedGroupId]);

  useEffect(() => { if (user) void loadCoachData(); }, [user]);

  async function loadCoachData() {
    if (!user) return;
    const [{ data: coachProfile }, { data: rels }, { data: blocks }, { data: coachGroups }, { data: groupBlocks }] = await Promise.all([
      db.from("coach_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      db.from("coach_relationships").select("*").eq("coach_id", user.id).eq("status", "accepted"),
      db.from("coach_focus_blocks").select("*").eq("coach_id", user.id).order("start_date", { ascending: false }).limit(100),
      db.from("coach_groups").select("*").eq("coach_id", user.id).order("created_at", { ascending: false }),
      db.from("coach_group_focus_blocks").select("*").eq("coach_id", user.id).order("start_date", { ascending: false }).limit(100),
    ]);
    setProfile(coachProfile ?? null);
    setFocusBlocks(((blocks ?? []) as FocusBlock[]).map((block) => ({ ...block, recommendations: Array.isArray(block.recommendations) ? block.recommendations : [] })));
    setGroups((coachGroups ?? []) as CoachGroup[]);
    setGroupFocusBlocks(((groupBlocks ?? []) as GroupFocusBlock[]).map((block) => ({ ...block, recommendations: Array.isArray(block.recommendations) ? block.recommendations : [] })));

    const groupIds = (coachGroups ?? []).map((g: CoachGroup) => g.id);
    if (groupIds.length) {
      const { data: members } = await db.from("coach_group_members").select("*").in("group_id", groupIds);
      setGroupMembers((members ?? []) as GroupMember[]);
    } else setGroupMembers([]);

    const coachRels = (rels ?? []) as Relationship[];
    const ids = [...new Set([...(isJohnMaster ? [user.id] : []), ...coachRels.map((r) => r.player_id)])];
    if (!ids.length) { setPlayers([]); setSessions({}); return; }

    const [{ data: profiles }, { data: snapshots }, { data: training }] = await Promise.all([
      db.from("profiles").select("id,display_name,gender,club_name").in("id", ids),
      db.from("player_snapshots").select("*").in("user_id", ids),
      db.from("test_sessions").select("id,user_id,test_id,category,played_at,score,test_handicap,metrics").in("user_id", ids).eq("test_type", "training").order("played_at", { ascending: false }).limit(100),
    ]);

    const realStudents = coachRels.map((relationship) => {
      const playerProfile = profiles?.find((p: any) => p.id === relationship.player_id);
      return { relationship, name: playerProfile?.display_name ?? "Spelare", gender: playerProfile?.gender ?? null, clubName: playerProfile?.club_name ?? null, snapshot: snapshots?.find((s: any) => s.user_id === relationship.player_id) };
    });
    const johnProfile = profiles?.find((p: any) => p.id === user.id);
    const johnPreview: PlayerRow[] = isJohnMaster ? [{ relationship: { id: "preview-self-john", player_id: user.id, coach_id: user.id, status: "accepted", share_training_data: true }, name: johnProfile?.display_name ?? displayName ?? "John", gender: johnProfile?.gender ?? null, clubName: johnProfile?.club_name ?? null, snapshot: snapshots?.find((s: any) => s.user_id === user.id) }] : [];
    setPlayers([...johnPreview, ...realStudents]);

    const grouped: Record<string, TrainingSession[]> = {};
    for (const session of training ?? []) {
      if (!grouped[session.user_id]) grouped[session.user_id] = [];
      if (grouped[session.user_id].length < 20) grouped[session.user_id].push(session);
    }
    setSessions(grouped);
  }

  function openPlayer(playerId: string) { setSelectedPlayerId(playerId); setView("player-profile"); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function openFocus(playerId: string) { setSelectedPlayerId(playerId); setView("focus-editor"); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function openGroup(groupId: string) { setSelectedGroupId(groupId); setView("group-profile"); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function openGroupFocus(groupId: string) { setSelectedGroupId(groupId); setView("group-focus-editor"); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function createFocusBlock(input: Omit<FocusBlock, "id" | "relationship_id" | "player_id" | "coach_id" | "status" | "extended_from" | "created_at">) {
    if (!user || !selectedPlayer) return;
    const preview = selectedPlayer.relationship.id === "preview-self-john" || selectedPlayer.relationship.id.startsWith("demo-");
    const existingActive = focusBlocks.find((block) => block.player_id === selectedPlayer.relationship.player_id && block.status === "active");
    if (preview) {
      setFocusBlocks((current) => [{ id: `preview-block-${Date.now()}`, relationship_id: selectedPlayer.relationship.id, player_id: selectedPlayer.relationship.player_id, coach_id: user.id, status: "active", extended_from: null, created_at: new Date().toISOString(), ...input }, ...current.map((block) => block.player_id === selectedPlayer.relationship.player_id && block.status === "active" ? { ...block, status: "completed" as const } : block)]);
      setMessage("Preview: nytt fokusblock skapat."); setView("player-profile"); return;
    }
    if (existingActive) await db.from("coach_focus_blocks").update({ status: "completed" }).eq("id", existingActive.id);
    const { data, error } = await db.from("coach_focus_blocks").insert({ relationship_id: selectedPlayer.relationship.id, player_id: selectedPlayer.relationship.player_id, coach_id: user.id, ...input }).select("*").single();
    if (!error && data) { setFocusBlocks((current) => [data as FocusBlock, ...current.map((block) => existingActive?.id === block.id ? { ...block, status: "completed" as const } : block)]); setMessage("Fokusblocket är sparat."); setView("player-profile"); }
  }

  async function finishBlock(block: FocusBlock) {
    const preview = block.id.startsWith("demo-") || block.id.startsWith("preview-");
    if (!preview) await db.from("coach_focus_blocks").update({ status: "completed" }).eq("id", block.id);
    setFocusBlocks((current) => current.map((item) => item.id === block.id ? { ...item, status: "completed" } : item)); setMessage("Fokusperioden är avslutad."); setView("player-profile");
  }

  async function extendBlock(block: FocusBlock) {
    if (!user || !selectedPlayer) return;
    const durationDays = blockDuration(block.start_date, block.end_date);
    const start = nextDay(block.end_date); const end = addDays(start, durationDays - 1);
    const next = { primary_focus: block.primary_focus, secondary_focus: block.secondary_focus, why_text: block.why_text, coach_note: block.coach_note, recommendations: block.recommendations, start_date: start, end_date: end };
    const preview = block.id.startsWith("demo-") || block.id.startsWith("preview-") || selectedPlayer.relationship.id === "preview-self-john";
    if (preview) {
      setFocusBlocks((current) => [{ id: `preview-block-${Date.now()}`, relationship_id: selectedPlayer.relationship.id, player_id: selectedPlayer.relationship.player_id, coach_id: user.id, status: "active", extended_from: block.id, created_at: new Date().toISOString(), ...next }, ...current.map((item) => item.id === block.id ? { ...item, status: "extended" as const } : item)]); setMessage("Preview: fokusperioden är förlängd."); setView("player-profile"); return;
    }
    await db.from("coach_focus_blocks").update({ status: "extended" }).eq("id", block.id);
    const { data, error } = await db.from("coach_focus_blocks").insert({ relationship_id: block.relationship_id, player_id: block.player_id, coach_id: block.coach_id, extended_from: block.id, ...next }).select("*").single();
    if (!error && data) { setFocusBlocks((current) => [data as FocusBlock, ...current.map((item) => item.id === block.id ? { ...item, status: "extended" as const } : item)]); setMessage("Fokusperioden är förlängd."); setView("player-profile"); }
  }

  async function createGroup(name: string, description: string) {
    if (!user || !name.trim()) return;
    if (useDemo) {
      const id = `preview-group-${Date.now()}`;
      setGroups((current) => [{ id, coach_id: user.id, name: name.trim(), description: description.trim() || null, created_at: new Date().toISOString() }, ...current]);
      setSelectedGroupId(id); setMessage("Preview: grupp skapad."); setView("group-profile"); return;
    }
    const { data, error } = await db.from("coach_groups").insert({ coach_id: user.id, name: name.trim(), description: description.trim() || null }).select("*").single();
    if (!error && data) { setGroups((current) => [data as CoachGroup, ...current]); setSelectedGroupId(data.id); setMessage("Gruppen är skapad."); setView("group-profile"); }
  }

  async function toggleGroupMember(group: CoachGroup, player: PlayerRow) {
    const existing = visibleGroupMembers.find((m) => m.group_id === group.id && m.player_id === player.relationship.player_id);
    const preview = group.id.startsWith("demo-") || group.id.startsWith("preview-") || player.relationship.id.startsWith("demo-") || player.relationship.id === "preview-self-john";
    if (existing) {
      if (!preview) await db.from("coach_group_members").delete().eq("group_id", group.id).eq("player_id", player.relationship.player_id);
      setGroupMembers((current) => current.filter((m) => !(m.group_id === group.id && m.player_id === player.relationship.player_id)));
    } else {
      const row: GroupMember = { group_id: group.id, relationship_id: player.relationship.id, player_id: player.relationship.player_id, created_at: new Date().toISOString() };
      if (!preview) {
        const { data, error } = await db.from("coach_group_members").insert({ group_id: group.id, relationship_id: player.relationship.id, player_id: player.relationship.player_id }).select("*").single();
        if (error) return;
        setGroupMembers((current) => [data as GroupMember, ...current]);
      } else setGroupMembers((current) => [row, ...current]);
    }
  }

  async function createGroupFocus(input: Omit<GroupFocusBlock, "id" | "group_id" | "coach_id" | "status" | "extended_from" | "created_at">) {
    if (!user || !selectedGroup) return;
    const existing = groupFocusBlocks.find((b) => b.group_id === selectedGroup.id && b.status === "active");
    const preview = selectedGroup.id.startsWith("demo-") || selectedGroup.id.startsWith("preview-");
    if (preview) {
      setGroupFocusBlocks((current) => [{ id: `preview-group-block-${Date.now()}`, group_id: selectedGroup.id, coach_id: user.id, status: "active", extended_from: null, created_at: new Date().toISOString(), ...input }, ...current.map((b) => b.group_id === selectedGroup.id && b.status === "active" ? { ...b, status: "completed" as const } : b)]); setMessage("Preview: gruppfokus skapat."); setView("group-profile"); return;
    }
    if (existing) await db.from("coach_group_focus_blocks").update({ status: "completed" }).eq("id", existing.id);
    const { data, error } = await db.from("coach_group_focus_blocks").insert({ group_id: selectedGroup.id, coach_id: user.id, ...input }).select("*").single();
    if (!error && data) { setGroupFocusBlocks((current) => [data as GroupFocusBlock, ...current.map((b) => existing?.id === b.id ? { ...b, status: "completed" as const } : b)]); setMessage("Gruppfokus är sparat."); setView("group-profile"); }
  }

  async function finishGroupFocus(block: GroupFocusBlock) {
    const preview = block.id.startsWith("demo-") || block.id.startsWith("preview-");
    if (!preview) await db.from("coach_group_focus_blocks").update({ status: "completed" }).eq("id", block.id);
    setGroupFocusBlocks((current) => current.map((b) => b.id === block.id ? { ...b, status: "completed" } : b)); setMessage("Gruppfokus avslutat."); setView("group-profile");
  }

  async function extendGroupFocus(block: GroupFocusBlock) {
    if (!user || !selectedGroup) return;
    const durationDays = blockDuration(block.start_date, block.end_date); const start = nextDay(block.end_date); const end = addDays(start, durationDays - 1);
    const next = { primary_focus: block.primary_focus, secondary_focus: block.secondary_focus, why_text: block.why_text, coach_note: block.coach_note, recommendations: block.recommendations, start_date: start, end_date: end };
    const preview = block.id.startsWith("demo-") || block.id.startsWith("preview-") || selectedGroup.id.startsWith("demo-") || selectedGroup.id.startsWith("preview-");
    if (preview) {
      setGroupFocusBlocks((current) => [{ id: `preview-group-block-${Date.now()}`, group_id: selectedGroup.id, coach_id: user.id, status: "active", extended_from: block.id, created_at: new Date().toISOString(), ...next }, ...current.map((b) => b.id === block.id ? { ...b, status: "extended" as const } : b)]); setMessage("Preview: gruppfokus förlängt."); setView("group-profile"); return;
    }
    await db.from("coach_group_focus_blocks").update({ status: "extended" }).eq("id", block.id);
    const { data, error } = await db.from("coach_group_focus_blocks").insert({ group_id: block.group_id, coach_id: block.coach_id, extended_from: block.id, ...next }).select("*").single();
    if (!error && data) { setGroupFocusBlocks((current) => [data as GroupFocusBlock, ...current.map((b) => b.id === block.id ? { ...b, status: "extended" as const } : b)]); setMessage("Gruppfokus förlängt."); setView("group-profile"); }
  }

  if (loading) return <main className="min-h-screen bg-[#e9edf1] p-5 text-slate-900">Laddar…</main>;
  if (!user) return <main className="min-h-screen bg-[#e9edf1] p-5"><Link to="/konto" className="font-medium text-sky-700">Logga in för att använda coachvyn →</Link></main>;

  const mainNavView: CoachView = view === "player-profile" || view === "focus-editor" ? "players" : view === "group-profile" || view === "group-focus-editor" ? "groups" : view;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#e9edf1] text-slate-900 dark:bg-[#101419] dark:text-slate-100">
      <div className="pointer-events-none absolute -left-24 -top-28 h-64 w-64 rounded-full bg-sky-100/20 blur-3xl" />
      <div className="relative mx-auto w-full max-w-md px-5 pb-32 pt-6">
        <header className="flex items-center justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-slate-600">SG4</p><span className="mt-0.5 block text-[22px] font-semibold tracking-[-.04em]">Coach</span></div>
          <div className="relative"><button type="button" onClick={() => setRoleMenuOpen((open) => !open)} className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium text-slate-800 ${glass}`}>{isJohnMaster ? "Coach John" : effectiveProfile?.display_name ?? "Coach"}<ChevronDown className={`h-3.5 w-3.5 ${roleMenuOpen ? "rotate-180" : ""}`} /></button>{roleMenuOpen ? <div className={`absolute right-0 z-50 mt-2 w-48 rounded-[22px] p-1.5 ${glass}`}><Link to="/" onClick={() => setRoleMenuOpen(false)} className="flex rounded-2xl px-3 py-3 text-sm font-medium">Byt till spelarvy</Link></div> : null}</div>
        </header>
        {message ? <p className={`mt-4 rounded-[22px] px-4 py-3 text-sm text-slate-700 ${glass}`}>{message}</p> : null}
        {view === "overview" ? <OverviewView players={visiblePlayers} blocks={visibleBlocks} groups={visibleGroups} groupBlocks={visibleGroupBlocks} onPlayer={openPlayer} onFocus={openFocus} onGroup={openGroup} /> : null}
        {view === "players" ? <PlayersDirectory players={visiblePlayers} blocks={visibleBlocks} onPlayer={openPlayer} /> : null}
        {view === "player-profile" && selectedPlayer ? <PlayerProfileView player={selectedPlayer} sessions={visibleSessions[selectedPlayer.relationship.player_id] ?? []} blocks={visibleBlocks} groupMemberships={visibleGroupMembers.filter((m) => m.player_id === selectedPlayer.relationship.player_id)} groups={visibleGroups} onBack={() => setView("players")} onFocus={() => openFocus(selectedPlayer.relationship.player_id)} /> : null}
        {view === "focus-editor" && selectedPlayer ? <FocusEditor player={selectedPlayer} blocks={visibleBlocks} onBack={() => setView("player-profile")} onCreate={createFocusBlock} onFinish={finishBlock} onExtend={extendBlock} /> : null}
        {view === "groups" ? <GroupsView groups={visibleGroups} members={visibleGroupMembers} blocks={visibleGroupBlocks} onGroup={openGroup} onCreate={createGroup} /> : null}
        {view === "group-profile" && selectedGroup ? <GroupProfileView group={selectedGroup} players={visiblePlayers} members={visibleGroupMembers} blocks={visibleGroupBlocks} onBack={() => setView("groups")} onToggleMember={toggleGroupMember} onFocus={() => openGroupFocus(selectedGroup.id)} /> : null}
        {view === "group-focus-editor" && selectedGroup ? <GroupFocusEditor group={selectedGroup} blocks={visibleGroupBlocks} onBack={() => setView("group-profile")} onCreate={createGroupFocus} onFinish={finishGroupFocus} onExtend={extendGroupFocus} /> : null}
        {view === "progress" ? <ProgressView players={visiblePlayers} sessions={visibleSessions} blocks={visibleBlocks} onPlayer={openPlayer} /> : null}
        {view === "more" ? <MoreView profile={effectiveProfile} isJohnMaster={isJohnMaster} /> : null}
      </div>
      <CoachNav view={mainNavView} onChange={setView} />
    </main>
  );
}

function OverviewView({ players, blocks, groups, groupBlocks, onPlayer, onFocus, onGroup }: { players: PlayerRow[]; blocks: FocusBlock[]; groups: CoachGroup[]; groupBlocks: GroupFocusBlock[]; onPlayer: (id: string) => void; onFocus: (id: string) => void; onGroup: (id: string) => void }) {
  const attention = players.map((player) => { const active = activeBlockFor(player.relationship.player_id, blocks); if (!active) return { player, text: "Saknar aktivt fokus" }; const days = daysUntil(active.end_date); if (days <= 7) return { player, text: days < 0 ? "Fokusperioden har löpt ut" : `${days} dagar kvar av fokusperioden` }; return null; }).filter(Boolean) as { player: PlayerRow; text: string }[];
  const groupAttention = groups.filter((group) => !activeGroupBlockFor(group.id, groupBlocks));
  return <>
    <section className={`mt-6 rounded-[34px] p-6 ${glass}`}><span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.16em] text-sky-900">Översikt</span><h1 className="mt-5 text-[38px] font-medium leading-[.98] tracking-[-.055em]">Dina spelare.</h1><p className="mt-3 text-sm leading-6 text-slate-600">Håll koll på riktningen för individer och grupper utan att detaljstyra träningen.</p><div className="mt-6 grid grid-cols-3 gap-2"><Metric label="Elever" value={String(players.length)} /><Metric label="Grupper" value={String(groups.length)} /><Metric label="Aktiva fokus" value={String(players.filter((p) => activeBlockFor(p.relationship.player_id, blocks)).length + groups.filter((g) => activeGroupBlockFor(g.id, groupBlocks)).length)} /></div></section>
    <section className="mt-8"><SectionTitle eyebrow="Att följa upp" title="Fokusperioder" right={`${attention.length + groupAttention.length}`} /><div className="space-y-2.5">{attention.map(({ player, text }) => <button key={player.relationship.id} onClick={() => onFocus(player.relationship.player_id)} className={`flex w-full items-center justify-between rounded-[24px] p-4 text-left ${glass}`}><span><span className="block text-sm font-medium">{player.name}</span><span className="mt-1 block text-xs text-slate-600">{text}</span></span><ChevronRight className="h-4 w-4 text-slate-500" /></button>)}{groupAttention.map((group) => <button key={group.id} onClick={() => onGroup(group.id)} className={`flex w-full items-center justify-between rounded-[24px] p-4 text-left ${glass}`}><span><span className="block text-sm font-medium">{group.name}</span><span className="mt-1 block text-xs text-slate-600">Gruppen saknar aktivt fokus</span></span><ChevronRight className="h-4 w-4 text-slate-500" /></button>)}{!attention.length && !groupAttention.length ? <div className={`rounded-[24px] p-4 text-sm text-slate-600 ${glass}`}>Alla fokusperioder ser aktuella ut.</div> : null}</div></section>
    <section className="mt-8 grid grid-cols-2 gap-3"><button onClick={() => players[0] && onPlayer(players[0].relationship.player_id)} className={`rounded-[26px] p-5 text-left ${glass}`}><Users className="h-5 w-5 text-sky-800" /><p className="mt-4 text-sm font-medium">Elever</p><p className="mt-1 text-xs text-slate-600">Sök och filtrera.</p></button><button onClick={() => groups[0] && onGroup(groups[0].id)} className={`rounded-[26px] p-5 text-left ${glass}`}><Target className="h-5 w-5 text-sky-800" /><p className="mt-4 text-sm font-medium">Grupper</p><p className="mt-1 text-xs text-slate-600">Gemensam riktning.</p></button></section>
  </>;
}

function PlayersDirectory({ players, blocks, onPlayer }: { players: PlayerRow[]; blocks: FocusBlock[]; onPlayer: (id: string) => void }) {
  const [query, setQuery] = useState(""); const [gender, setGender] = useState("Alla"); const [club, setClub] = useState("Alla"); const [focusStatus, setFocusStatus] = useState("Alla");
  const clubs = useMemo(() => [...new Set(players.map((p) => p.clubName).filter(Boolean) as string[])].sort(), [players]);
  const genders = useMemo(() => [...new Set(players.map((p) => p.gender).filter(Boolean) as string[])].sort(), [players]);
  const filtered = players.filter((player) => { const q = query.trim().toLowerCase(); const matchesQuery = !q || player.name.toLowerCase().includes(q) || (player.clubName ?? "").toLowerCase().includes(q); const matchesGender = gender === "Alla" || (player.gender ?? "Ej angivet") === gender; const matchesClub = club === "Alla" || (player.clubName ?? "Ej angivet") === club; const hasFocus = Boolean(activeBlockFor(player.relationship.player_id, blocks)); const matchesFocus = focusStatus === "Alla" || (focusStatus === "Aktivt fokus" ? hasFocus : !hasFocus); return matchesQuery && matchesGender && matchesClub && matchesFocus; });
  return <section className="mt-7"><SectionTitle eyebrow="Elever" title="Alla elever" right={`${filtered.length}/${players.length}`} /><div className={`rounded-[28px] p-4 ${glass}`}><div className="flex items-center gap-2 rounded-[18px] border border-slate-300 bg-white px-3"><Search className="h-4 w-4 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sök elev eller klubb" className="w-full bg-transparent py-3 text-sm outline-none" /></div><div className="mt-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500"><SlidersHorizontal className="h-3.5 w-3.5" />Filter</div><div className="mt-2 grid grid-cols-3 gap-2"><FilterSelect value={gender} onChange={setGender} options={["Alla", ...genders, ...(genders.includes("Ej angivet") ? [] : ["Ej angivet"])]} label="Kön" /><FilterSelect value={club} onChange={setClub} options={["Alla", ...clubs, ...(clubs.includes("Ej angivet") ? [] : ["Ej angivet"])]} label="Klubb" /><FilterSelect value={focusStatus} onChange={setFocusStatus} options={["Alla", "Aktivt fokus", "Utan fokus"]} label="Fokus" /></div></div><div className="mt-4 space-y-2.5">{filtered.map((player) => <DirectoryPlayerCard key={player.relationship.id} player={player} block={activeBlockFor(player.relationship.player_id, blocks)} onClick={() => onPlayer(player.relationship.player_id)} />)}{!filtered.length ? <div className={`rounded-[24px] p-5 text-center text-sm text-slate-600 ${glass}`}>Inga elever matchar filtret.</div> : null}</div></section>;
}

function PlayerProfileView({ player, sessions, blocks, groupMemberships, groups, onBack, onFocus }: { player: PlayerRow; sessions: TrainingSession[]; blocks: FocusBlock[]; groupMemberships: GroupMember[]; groups: CoachGroup[]; onBack: () => void; onFocus: () => void }) {
  const playerBlocks = blocks.filter((b) => b.player_id === player.relationship.player_id).sort((a, b) => b.start_date.localeCompare(a.start_date)); const active = playerBlocks.find((b) => b.status === "active") ?? null; const progress = getProgress(player, sessions); const completedCount = playerBlocks.filter((b) => b.status !== "active").length; const playerGroups = groups.filter((g) => groupMemberships.some((m) => m.group_id === g.id));
  return <><BackButton onClick={onBack}>Alla elever</BackButton><section className={`mt-4 rounded-[32px] p-5 ${glass}`}><div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-800 ring-1 ring-slate-300">{player.name.slice(0,1).toUpperCase()}</span><div><h1 className="text-2xl font-semibold tracking-[-.04em]">{player.name}</h1><p className="mt-1 text-sm text-slate-600">{player.clubName ?? "Klubb ej angiven"}{player.gender ? ` · ${player.gender}` : ""}</p></div></div><div className="mt-5 grid grid-cols-3 gap-2"><Metric label="Start HCP" value={progress.start !== null ? formatNumber(progress.start) : "–"} /><Metric label="Nu" value={progress.current !== null ? formatNumber(progress.current) : "–"} /><Metric label="Förändring" value={progress.improvement !== null ? `${progress.improvement > 0 ? "−" : "+"}${formatNumber(Math.abs(progress.improvement))}` : "–"} positive={Boolean(progress.improvement && progress.improvement > 0)} /></div><div className="mt-5 grid grid-cols-2 gap-2"><Metric label="Tillsammans" value={relationshipAge(player.relationship)} /><Metric label="Fokusblock" value={String(playerBlocks.length)} /></div><p className="mt-4 text-xs text-slate-600">{relationshipText(player.relationship)} · {completedCount} avslutade/förlängda fokusperioder</p>{playerGroups.length ? <p className="mt-2 text-xs text-slate-600">Grupper: {playerGroups.map((g) => g.name).join(", ")}</p> : null}</section><section className="mt-8"><SectionTitle eyebrow="Från tränaren" title="Aktuellt individuellt fokus" />{active ? <FocusBlockCard block={active} /> : <div className={`rounded-[28px] p-5 text-sm text-slate-600 ${glass}`}>Inget aktivt individuellt fokus just nu.</div>}<button onClick={onFocus} className="mt-3 w-full rounded-[20px] bg-sky-700 py-3.5 text-sm font-medium text-white">{active ? "Hantera fokus" : "Skapa fokus"}</button></section><section className="mt-8"><SectionTitle eyebrow="Historik" title="Individuella fokusblock" right={`${playerBlocks.length}`} /><div className="space-y-3">{playerBlocks.map((block) => <FocusHistoryRow key={block.id} block={block} />)}{!playerBlocks.length ? <div className={`rounded-[24px] p-4 text-sm text-slate-500 ${glass}`}>Ingen fokushistorik ännu.</div> : null}</div></section><section className="mt-8"><SectionTitle eyebrow="Utveckling" title="Träningsunderlag" /><div className={`rounded-[28px] p-5 ${glass}`}><p className="text-sm leading-6 text-slate-600">Data används som underlag för coachens bedömning, inte för detaljstyrning.</p><div className="mt-4 space-y-3">{sessions.slice(0,3).map((s) => <SessionSummary key={s.id} session={s} />)}{!sessions.length ? <p className="text-sm text-slate-500">Ingen träningsdata ännu.</p> : null}</div></div></section></>;
}

function FocusEditor({ player, blocks, onBack, onCreate, onFinish, onExtend }: { player: PlayerRow; blocks: FocusBlock[]; onBack: () => void; onCreate: (input: Omit<FocusBlock, "id" | "relationship_id" | "player_id" | "coach_id" | "status" | "extended_from" | "created_at">) => void; onFinish: (block: FocusBlock) => void; onExtend: (block: FocusBlock) => void }) {
  const active = activeBlockFor(player.relationship.player_id, blocks); const [primary, setPrimary] = useState(""); const [secondary, setSecondary] = useState(""); const [why, setWhy] = useState(""); const [note, setNote] = useState(""); const [recommendations, setRecommendations] = useState(""); const [weeks, setWeeks] = useState(6);
  function save() { if (!primary.trim()) return; const start = new Date(); const end = new Date(start); end.setDate(end.getDate() + weeks * 7 - 1); onCreate({ primary_focus: primary.trim(), secondary_focus: secondary.trim() || null, why_text: why.trim() || null, coach_note: note.trim() || null, recommendations: recommendations.split("\n").map((x) => x.trim()).filter(Boolean), start_date: dateInput(start), end_date: dateInput(end) }); }
  return <><BackButton onClick={onBack}>{player.name}</BackButton>{active ? <section className="mt-4"><SectionTitle eyebrow="Aktivt" title="Nuvarande fokus" /><FocusBlockCard block={active} /><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => onExtend(active)} className="rounded-[18px] border border-sky-300 bg-sky-50 py-3 text-sm font-medium text-sky-900">Förläng fokus</button><button onClick={() => onFinish(active)} className="rounded-[18px] border border-slate-300 bg-white py-3 text-sm font-medium text-slate-700">Avsluta</button></div></section> : null}<FocusForm active={Boolean(active)} primary={primary} secondary={secondary} why={why} note={note} recommendations={recommendations} weeks={weeks} setPrimary={setPrimary} setSecondary={setSecondary} setWhy={setWhy} setNote={setNote} setRecommendations={setRecommendations} setWeeks={setWeeks} onSave={save} /></>;
}

function GroupsView({ groups, members, blocks, onGroup, onCreate }: { groups: CoachGroup[]; members: GroupMember[]; blocks: GroupFocusBlock[]; onGroup: (id: string) => void; onCreate: (name: string, description: string) => void }) {
  const [showCreate, setShowCreate] = useState(false); const [name, setName] = useState(""); const [description, setDescription] = useState("");
  return <section className="mt-7"><div className="flex items-end justify-between"><SectionTitle eyebrow="Grupper" title="Träningsgrupper" right={`${groups.length}`} /><button onClick={() => setShowCreate((v) => !v)} className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky-700 text-white"><Plus className="h-4 w-4" /></button></div><p className="mb-4 px-1 text-sm leading-6 text-slate-600">Sätt en gemensam riktning för exempelvis juniorgrupp eller vinterträning. Individuellt fokus kan finnas samtidigt.</p>{showCreate ? <div className={`mb-4 rounded-[28px] p-4 ${glass}`}><FieldLabel>Gruppnamn</FieldLabel><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Juniorgrupp U16" className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none" /><FieldLabel className="mt-4">Beskrivning</FieldLabel><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Valfritt" className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none" /><button onClick={() => { onCreate(name, description); setName(""); setDescription(""); setShowCreate(false); }} disabled={!name.trim()} className="mt-4 w-full rounded-[18px] bg-sky-700 py-3 text-sm font-medium text-white disabled:opacity-40">Skapa grupp</button></div> : null}<div className="space-y-3">{groups.map((group) => { const count = members.filter((m) => m.group_id === group.id).length; const active = activeGroupBlockFor(group.id, blocks); return <button key={group.id} onClick={() => onGroup(group.id)} className={`w-full rounded-[26px] p-5 text-left ${glass}`}><div className="flex items-center justify-between"><div><p className="text-[16px] font-medium">{group.name}</p><p className="mt-1 text-xs text-slate-500">{count} elever{group.description ? ` · ${group.description}` : ""}</p></div><ChevronRight className="h-4 w-4 text-slate-500" /></div><div className="mt-4 border-t border-slate-200 pt-3"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">Gruppfokus</p><p className={`mt-1 text-sm font-medium ${active ? "text-sky-900" : "text-slate-500"}`}>{active?.primary_focus ?? "Inget aktivt fokus"}</p></div></button>; })}{!groups.length ? <div className={`rounded-[26px] p-5 text-sm text-slate-600 ${glass}`}>Skapa din första grupp för gemensamt fokus och kommunikation.</div> : null}</div></section>;
}

function GroupProfileView({ group, players, members, blocks, onBack, onToggleMember, onFocus }: { group: CoachGroup; players: PlayerRow[]; members: GroupMember[]; blocks: GroupFocusBlock[]; onBack: () => void; onToggleMember: (group: CoachGroup, player: PlayerRow) => void; onFocus: () => void }) {
  const groupMembers = members.filter((m) => m.group_id === group.id); const groupBlocks = blocks.filter((b) => b.group_id === group.id).sort((a,b) => b.start_date.localeCompare(a.start_date)); const active = groupBlocks.find((b) => b.status === "active") ?? null;
  return <><BackButton onClick={onBack}>Alla grupper</BackButton><section className={`mt-4 rounded-[32px] p-5 ${glass}`}><div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-900"><Users className="h-6 w-6" /></span><div><h1 className="text-2xl font-semibold tracking-[-.04em]">{group.name}</h1><p className="mt-1 text-sm text-slate-600">{group.description ?? "Träningsgrupp"}</p></div></div><div className="mt-5 grid grid-cols-2 gap-2"><Metric label="Elever" value={String(groupMembers.length)} /><Metric label="Fokusblock" value={String(groupBlocks.length)} /></div></section><section className="mt-8"><SectionTitle eyebrow="Gemensam riktning" title="Aktuellt gruppfokus" />{active ? <GroupFocusCard block={active} /> : <div className={`rounded-[28px] p-5 text-sm text-slate-600 ${glass}`}>Inget aktivt gruppfokus.</div>}<button onClick={onFocus} className="mt-3 w-full rounded-[20px] bg-sky-700 py-3.5 text-sm font-medium text-white">{active ? "Hantera gruppfokus" : "Skapa gruppfokus"}</button></section><section className="mt-8"><SectionTitle eyebrow="Medlemmar" title="Elever i gruppen" right={`${groupMembers.length}`} /><div className={`rounded-[28px] p-3 ${glass}`}>{players.map((player) => { const included = groupMembers.some((m) => m.player_id === player.relationship.player_id); return <button key={player.relationship.id} onClick={() => onToggleMember(group, player)} className="flex w-full items-center justify-between border-b border-slate-200 px-2 py-3 text-left last:border-0"><span><span className="block text-sm font-medium">{player.name}</span><span className="mt-0.5 block text-xs text-slate-500">{player.clubName ?? "Klubb ej angiven"}</span></span><span className={`flex h-7 w-7 items-center justify-center rounded-full border ${included ? "border-sky-600 bg-sky-700 text-white" : "border-slate-300 bg-white text-transparent"}`}><Check className="h-4 w-4" /></span></button>; })}</div></section><section className="mt-8"><SectionTitle eyebrow="Historik" title="Gruppfokus" right={`${groupBlocks.length}`} /><div className="space-y-3">{groupBlocks.map((block) => <GroupFocusHistoryRow key={block.id} block={block} />)}{!groupBlocks.length ? <div className={`rounded-[24px] p-4 text-sm text-slate-500 ${glass}`}>Ingen gruppfokushistorik ännu.</div> : null}</div></section></>;
}

function GroupFocusEditor({ group, blocks, onBack, onCreate, onFinish, onExtend }: { group: CoachGroup; blocks: GroupFocusBlock[]; onBack: () => void; onCreate: (input: Omit<GroupFocusBlock, "id" | "group_id" | "coach_id" | "status" | "extended_from" | "created_at">) => void; onFinish: (block: GroupFocusBlock) => void; onExtend: (block: GroupFocusBlock) => void }) {
  const active = activeGroupBlockFor(group.id, blocks); const [primary, setPrimary] = useState(""); const [secondary, setSecondary] = useState(""); const [why, setWhy] = useState(""); const [note, setNote] = useState(""); const [recommendations, setRecommendations] = useState(""); const [weeks, setWeeks] = useState(6);
  function save() { if (!primary.trim()) return; const start = new Date(); const end = new Date(start); end.setDate(end.getDate() + weeks * 7 - 1); onCreate({ primary_focus: primary.trim(), secondary_focus: secondary.trim() || null, why_text: why.trim() || null, coach_note: note.trim() || null, recommendations: recommendations.split("\n").map((x) => x.trim()).filter(Boolean), start_date: dateInput(start), end_date: dateInput(end) }); }
  return <><BackButton onClick={onBack}>{group.name}</BackButton>{active ? <section className="mt-4"><SectionTitle eyebrow="Aktivt" title="Nuvarande gruppfokus" /><GroupFocusCard block={active} /><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => onExtend(active)} className="rounded-[18px] border border-sky-300 bg-sky-50 py-3 text-sm font-medium text-sky-900">Förläng fokus</button><button onClick={() => onFinish(active)} className="rounded-[18px] border border-slate-300 bg-white py-3 text-sm font-medium text-slate-700">Avsluta</button></div></section> : null}<FocusForm active={Boolean(active)} primary={primary} secondary={secondary} why={why} note={note} recommendations={recommendations} weeks={weeks} setPrimary={setPrimary} setSecondary={setSecondary} setWhy={setWhy} setNote={setNote} setRecommendations={setRecommendations} setWeeks={setWeeks} onSave={save} group /></>;
}

function FocusForm({ active, primary, secondary, why, note, recommendations, weeks, setPrimary, setSecondary, setWhy, setNote, setRecommendations, setWeeks, onSave, group }: any) {
  return <section className="mt-8"><SectionTitle eyebrow={active ? "Nästa riktning" : "Nytt fokus"} title={group ? "Gruppfokus" : "Fokusperiod"} /><div className={`rounded-[30px] p-5 ${glass}`}><FieldLabel>Huvudfokus</FieldLabel><input value={primary} onChange={(e) => setPrimary(e.target.value)} placeholder="Ex. Around the Green" className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none" /><FieldLabel className="mt-4">Sekundärt fokus</FieldLabel><input value={secondary} onChange={(e) => setSecondary(e.target.value)} placeholder="Valfritt" className="mt-2 w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none" /><FieldLabel className="mt-4">Riktning</FieldLabel><textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={2} placeholder={group ? "Vad bör gruppen prioritera?" : "Vad bör eleven prioritera?"} className="mt-2 w-full resize-none rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none" /><FieldLabel className="mt-4">Coachens kommentar</FieldLabel><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="En kort påminnelse från tränaren." className="mt-2 w-full resize-none rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none" /><FieldLabel className="mt-4">Rekommenderade tester & övningar</FieldLabel><textarea value={recommendations} onChange={(e) => setRecommendations(e.target.value)} rows={3} placeholder={"En per rad\n8-bollar\nKlock-putt"} className="mt-2 w-full resize-none rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none" /><FieldLabel className="mt-4">Period</FieldLabel><div className="mt-2 grid grid-cols-4 gap-2">{[2,4,6,8].map((w) => <button key={w} onClick={() => setWeeks(w)} className={`rounded-[16px] border py-2.5 text-xs font-medium ${weeks === w ? "border-sky-400 bg-sky-100 text-sky-900" : "border-slate-300 bg-white text-slate-600"}`}>{w} v</button>)}</div><button onClick={onSave} disabled={!primary.trim()} className="mt-5 w-full rounded-[20px] bg-sky-700 py-3.5 text-sm font-medium text-white disabled:opacity-40">{active ? "Starta nytt fokus" : "Skapa fokus"}</button></div></section>;
}

function ProgressView({ players, sessions, blocks, onPlayer }: { players: PlayerRow[]; sessions: Record<string, TrainingSession[]>; blocks: FocusBlock[]; onPlayer: (id: string) => void }) {
  return <><section className={`mt-6 rounded-[34px] p-6 ${glass}`}><span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.16em] text-sky-900">Utveckling</span><h1 className="mt-5 text-[34px] font-medium tracking-[-.05em]">Utveckling över tid.</h1><p className="mt-3 text-sm leading-6 text-slate-600">Data som stöd för bedömningen, inte som press på eleven.</p></section><section className="mt-8"><SectionTitle eyebrow="Start → nu" title="Elevutveckling" /><div className="space-y-3">{players.map((player) => { const p = getProgress(player, sessions[player.relationship.player_id] ?? []); const count = blocks.filter((b) => b.player_id === player.relationship.player_id).length; return <button key={player.relationship.id} onClick={() => onPlayer(player.relationship.player_id)} className={`w-full rounded-[28px] p-5 text-left ${glass}`}><div className="flex items-center justify-between"><div><p className="text-[15px] font-medium">{player.name}</p><p className="mt-1 text-xs text-slate-500">{count} fokusblock</p></div><ChevronRight className="h-4 w-4 text-slate-500" /></div><div className="mt-4 grid grid-cols-3 gap-2"><Metric label="Start" value={p.start !== null ? formatNumber(p.start) : "–"} /><Metric label="Nu" value={p.current !== null ? formatNumber(p.current) : "–"} /><Metric label="Trend" value={p.improvement !== null ? `${p.improvement > 0 ? "−" : "+"}${formatNumber(Math.abs(p.improvement))}` : "–"} positive={Boolean(p.improvement && p.improvement > 0)} /></div></button>; })}</div></section></>;
}

function MoreView({ profile, isJohnMaster }: { profile: CoachProfile | null; isJohnMaster: boolean }) { return <section className="mt-7"><SectionTitle eyebrow="Mer" title="Coachinställningar" /><div className={`rounded-[30px] p-5 ${glass}`}><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">Elevkod</p><p className="mt-2 text-3xl font-medium tracking-[.08em]">{isJohnMaster ? "JOHN" : profile?.invite_code ?? "–"}</p></div><Link to="/" className={`mt-3 flex items-center justify-between rounded-[24px] px-4 py-4 text-sm font-medium ${glass}`}><span>Byt till spelarvy</span><ChevronRight className="h-4 w-4 text-slate-500" /></Link></section>; }

function CoachNav({ view, onChange }: { view: CoachView; onChange: (view: CoachView) => void }) {
  const items = [["overview", "Översikt", LayoutDashboard], ["players", "Elever", Users], ["groups", "Grupper", Target], ["progress", "Utveckling", BarChart3], ["more", "Mer", MoreHorizontal]] as const;
  return <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md px-4 pb-[max(12px,env(safe-area-inset-bottom))]"><div className="grid grid-cols-5 rounded-[30px] border border-slate-200 bg-white/98 px-1.5 py-2 shadow-[0_18px_48px_-16px_rgba(30,41,59,.40)] backdrop-blur-2xl">{items.map(([key,label,Icon]) => <button key={key} onClick={() => { onChange(key); window.scrollTo({top:0,behavior:"smooth"}); }} className={`flex min-w-0 flex-col items-center gap-1 rounded-[20px] px-1 py-2 ${view === key ? "bg-sky-100 text-sky-900" : "text-slate-500"}`}><Icon className="h-[19px] w-[19px]" /><span className="truncate text-[9px] font-semibold">{label}</span></button>)}</div></nav>;
}

function DirectoryPlayerCard({ player, block, onClick }: { player: PlayerRow; block: FocusBlock | null; onClick: () => void }) { return <button onClick={onClick} className={`flex w-full items-center justify-between rounded-[24px] p-4 text-left ${glass}`}><span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-700 ring-1 ring-slate-300">{player.name.slice(0,1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-[15px] font-medium">{player.name}</span><span className="mt-1 block truncate text-xs text-slate-500">{player.clubName ?? "Klubb ej angiven"} · HCP {player.snapshot?.est_hcp ?? "–"}</span>{block ? <span className="mt-1 block truncate text-[11px] font-medium text-sky-800">Fokus: {block.primary_focus}</span> : <span className="mt-1 block text-[11px] text-slate-500">Inget aktivt fokus</span>}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-slate-500" /></button>; }
function FilterSelect({ value, onChange, options, label }: { value: string; onChange: (value:string)=>void; options:string[]; label:string }) { return <label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[.12em] text-slate-500">{label}</span><select value={value} onChange={(e)=>onChange(e.target.value)} className="w-full rounded-[14px] border border-slate-300 bg-white px-2 py-2 text-[11px] outline-none">{options.map((o)=><option key={o}>{o}</option>)}</select></label>; }
function FocusBlockCard({ block }: { block: FocusBlock }) { return <FocusCard title="Fokus från tränaren" block={block} />; }
function GroupFocusCard({ block }: { block: GroupFocusBlock }) { return <FocusCard title="Gruppfokus från tränaren" block={block} />; }
function FocusCard({ title, block }: { title: string; block: { primary_focus:string; secondary_focus:string|null; why_text:string|null; coach_note:string|null; recommendations:string[]; start_date:string; end_date:string } }) { return <div className={`rounded-[30px] p-5 ${glass}`}><div className="flex items-center justify-between gap-3"><span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-sky-900">{title}</span><span className="shrink-0 text-[11px] text-slate-500">{formatDate(block.start_date)} – {formatDate(block.end_date)}</span></div><h3 className="mt-5 text-[26px] font-medium tracking-[-.04em]">{block.primary_focus}</h3>{block.secondary_focus ? <p className="mt-1 text-sm text-slate-600">Sekundärt: {block.secondary_focus}</p> : null}{block.why_text ? <div className="mt-5"><MiniLabel>Riktning</MiniLabel><p className="mt-1 text-sm leading-6 text-slate-700">{block.why_text}</p></div> : null}{block.recommendations.length ? <div className="mt-5"><MiniLabel>Rekommenderat</MiniLabel><div className="mt-2 flex flex-wrap gap-2">{block.recommendations.map((item)=><span key={item} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">{item}</span>)}</div></div> : null}{block.coach_note ? <div className="mt-5 rounded-[20px] border border-sky-200 bg-sky-50 p-4"><MiniLabel>Coachens kommentar</MiniLabel><p className="mt-1 text-sm leading-6 text-slate-800">“{block.coach_note}”</p></div> : null}</div>; }
function FocusHistoryRow({ block }: { block: FocusBlock }) { return <HistoryRow status={statusLabel(block.status)} primary={block.primary_focus} secondary={block.secondary_focus} start={block.start_date} end={block.end_date} />; }
function GroupFocusHistoryRow({ block }: { block: GroupFocusBlock }) { return <HistoryRow status={statusLabel(block.status)} primary={block.primary_focus} secondary={block.secondary_focus} start={block.start_date} end={block.end_date} />; }
function HistoryRow({ status, primary, secondary, start, end }: { status:string; primary:string; secondary:string|null; start:string; end:string }) { return <div className={`rounded-[24px] p-4 ${glass}`}><div className="flex justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">{status}</p><p className="mt-1 text-sm font-medium">{primary}</p>{secondary ? <p className="mt-1 text-xs text-slate-600">+ {secondary}</p> : null}</div><span className="text-[10px] text-slate-500">{formatDate(start)}–{formatDate(end)}</span></div></div>; }
function SessionSummary({ session }: { session: TrainingSession }) { return <div className="border-b border-slate-200 pb-3 last:border-0 last:pb-0"><div className="flex justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">{categoryLabel(session.category)}</p><p className="mt-1 text-sm font-medium">{testLabel(session.test_id)}</p></div><span className="text-[11px] text-slate-500">{new Date(session.played_at).toLocaleDateString("sv-SE")}</span></div></div>; }
function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) { return <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3"><p className="text-[9px] font-semibold uppercase tracking-[.12em] text-slate-500">{label}</p><p className={`mt-1 text-[17px] font-medium ${positive ? "text-emerald-700" : "text-slate-900"}`}>{value}</p></div>; }
function SectionTitle({ eyebrow, title, right }: { eyebrow: string; title: string; right?: string }) { return <div className="mb-3 flex items-end justify-between px-1"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">{eyebrow}</p><h2 className="mt-1 text-xl font-medium tracking-[-.035em]">{title}</h2></div>{right ? <span className="text-xs text-slate-500">{right}</span> : null}</div>; }
function BackButton({ onClick, children }: { onClick:()=>void; children:React.ReactNode }) { return <button onClick={onClick} className="mt-6 flex items-center gap-1 text-sm font-medium text-slate-700"><ChevronLeft className="h-4 w-4" />{children}</button>; }
function FieldLabel({ children, className="" }: { children:React.ReactNode; className?:string }) { return <label className={`block text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500 ${className}`}>{children}</label>; }
function MiniLabel({ children }: { children:React.ReactNode }) { return <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-slate-500">{children}</p>; }
function activeBlockFor(playerId:string, blocks:FocusBlock[]) { return blocks.filter((b)=>b.player_id===playerId && b.status==="active").sort((a,b)=>b.start_date.localeCompare(a.start_date))[0] ?? null; }
function activeGroupBlockFor(groupId:string, blocks:GroupFocusBlock[]) { return blocks.filter((b)=>b.group_id===groupId && b.status==="active").sort((a,b)=>b.start_date.localeCompare(a.start_date))[0] ?? null; }
function getProgress(player:PlayerRow,sessions:TrainingSession[]) { const measured=[...sessions].filter((s)=>s.test_handicap!==null).sort((a,b)=>+new Date(a.played_at)-+new Date(b.played_at)); const start=measured[0]?.test_handicap ?? null; const latest=measured[measured.length-1]?.test_handicap ?? null; const current=player.snapshot?.est_hcp ?? latest; return { start, current: current ?? null, improvement: start!==null && current!==null && current!==undefined ? start-current : null }; }
function relationshipAge(r:Relationship) { if(!r.created_at) return "Live-konto"; const days=Math.max(0,Math.floor((Date.now()-+new Date(r.created_at))/86400000)); if(days<31)return `${days} dagar`; const months=Math.floor(days/30.44); if(months<12)return `${months} mån`; const years=Math.floor(months/12); const rest=months%12; return rest?`${years} år ${rest} mån`:`${years} år`; }
function relationshipText(r:Relationship) { return r.created_at ? `Elev sedan ${new Date(r.created_at).toLocaleDateString("sv-SE")} · ${relationshipAge(r)} tillsammans` : "Live-data från spelarens konto. Ingen faktisk coachrelation finns ännu."; }
function daysUntil(date:string){return Math.ceil((+new Date(`${date}T23:59:59`)-Date.now())/86400000)}
function dateInput(date:Date){return date.toISOString().slice(0,10)}
function blockDuration(start:string,end:string){return Math.max(14,Math.round((+new Date(`${end}T00:00:00`)-+new Date(`${start}T00:00:00`))/86400000)+1)}
function nextDay(date:string){const d=new Date(`${date}T00:00:00`);d.setDate(d.getDate()+1);return dateInput(d)}
function addDays(date:string,days:number){const d=new Date(`${date}T00:00:00`);d.setDate(d.getDate()+days);return dateInput(d)}
function formatDate(date:string){return new Date(`${date}T12:00:00`).toLocaleDateString("sv-SE",{day:"numeric",month:"short"})}
function formatNumber(value:number){return Number.isInteger(value)?String(value):value.toFixed(1)}
function statusLabel(status:"active"|"completed"|"extended"){return status==="active"?"Aktivt":status==="extended"?"Förlängt":"Avslutat"}
function categoryLabel(category:string){return ({driving:"Off the Tee",approach:"Approach","around-the-green":"Around the Green",puttning:"Putting",speed:"Speed"} as Record<string,string>)[category] ?? category}
function testLabel(testId:string){return testId.split("-").map((p)=>p.charAt(0).toUpperCase()+p.slice(1)).join(" ")}
