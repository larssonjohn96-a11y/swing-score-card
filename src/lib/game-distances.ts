export type DistanceGame = "putt" | "chip";
export const GAME_DISTANCE_ZONES = {
  putt: [[1, 1.5, 2, 2.5, 3], [4, 5, 6, 7], [8, 9, 10, 11, 12]],
  chip: [[8, 9, 10], [11, 12, 13, 14], [15, 16, 17, 18]],
} as const;

/** Fixed at start, balanced zones, no adjacent equal zones or repeated meters.
 * A rematch uses fresh distances first and a different zone order.
 * Injected randomness keeps solo reducers deterministic.
 */
export function generateGameDistances(
  kind: DistanceGame,
  length: 3 | 5 | 6 | 7,
  previous: readonly number[] = [],
  random: () => number = Math.random,
): number[] {
  const zones = GAME_DISTANCE_ZONES[kind];
  const shuffle = <T,>(values: readonly T[]): T[] => {
    const out = [...values];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const counts = [0, 1, 2].map(() => Math.floor(length / 3));
  for (const zone of shuffle([0, 1, 2]).slice(0, length % 3)) counts[zone]++;
  const previousOrder = previous.map(d => zones.findIndex(zone => (zone as readonly number[]).includes(d)));
  const orders: number[][] = [];
  const visit = (order: number[]) => {
    if (order.length === length) {
      if (!order.every((zone, i) => zone === previousOrder[i]) || previousOrder.length !== length) orders.push(order);
      return;
    }
    for (let zone = 0; zone < 3; zone++) {
      if (!counts[zone] || order.at(-1) === zone) continue;
      counts[zone]--;
      visit([...order, zone]);
      counts[zone]++;
    }
  };
  visit([]);
  const order = orders[Math.floor(random() * orders.length)];
  const pools = zones.map(zone => [
    ...shuffle(zone.filter(d => !previous.includes(d))),
    ...shuffle(zone.filter(d => previous.includes(d))),
  ]);
  return order.map(zone => pools[zone].shift()!);
}
