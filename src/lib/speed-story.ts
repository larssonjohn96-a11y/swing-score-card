import { ALL_GOLFERS_BALL_SPEED, ballSpeedDistributionForAge, ballSpeedPercentile } from "./speed";

// Trackman Tour Averages, 2023 dataset, published May 2024.
export const TOUR_SPEEDS = [
  { name: "PGA Tour", mph: 171 },
  { name: "LPGA Tour", mph: 143 },
] as const;
// Zdeno Chára, NHL All-Star Skills Competition, 2012.
export const NHL_SHOT_MPH = 108.8;
export function speedStories(speed: number, age?: number) {
  const all = ballSpeedPercentile(speed, ALL_GOLFERS_BALL_SPEED.mean, ALL_GOLFERS_BALL_SPEED.sd);
  const group = age ? ballSpeedDistributionForAge(age) : undefined;
  const showAll = !group || all >= ballSpeedPercentile(speed, group.mean, group.sd);
  return ["hcp", "age", ...(showAll ? ["all"] : []), "tour", "perspective", "distance"];
}
export function tourMessage(speed: number, reference: number, name: string) {
  if (speed > reference) return `Wow! Ditt bästa slag slår bollhastigheten i ${name}-snittet!`;
  if (speed === reference) return `Wow! Ditt bästa slag matchar ${name}-snittet!`;
  if (speed >= reference * 0.95) return `Du är nära ${name}-snittet – stark fart!`;
  return `Ditt bästa slag når ${Math.floor((speed / reference) * 100)} % av ${name}-snittets bollhastighet.`;
}
