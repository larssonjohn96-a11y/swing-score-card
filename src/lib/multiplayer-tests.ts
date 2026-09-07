import type { MultiplayerTestAdapter } from "@/lib/multiplayer-core";

export type EightBallMultiplayerResult = { points: number };

export const EIGHT_BALL_MULTIPLAYER_ADAPTER: MultiplayerTestAdapter<EightBallMultiplayerResult> = {
  testId: "eight-ball",
  mode: "turn-based",
  totalSteps: 40,
  maxPlayers: 4,
  // Keep the proven 8-ball RPCs for now. The generic core lets future tests
  // use the generic RPCs without rebuilding session/realtime logic.
  createRpc: "create_eight_ball_group_session",
  fetchRpc: "get_eight_ball_group_session",
  recordRpc: "record_eight_ball_group_score",
  toRpcResult: (result) => ({ p_points: result.points }),
  mapLegacyScore: (row) => ({ points: Number(row.points ?? 0) }),
};

export const MULTIPLAYER_TESTS = {
  "eight-ball": EIGHT_BALL_MULTIPLAYER_ADAPTER,
} as const;

export type MultiplayerTestId = keyof typeof MULTIPLAYER_TESTS;

export function getMultiplayerTestAdapter(testId: string) {
  return MULTIPLAYER_TESTS[testId as MultiplayerTestId] ?? null;
}
