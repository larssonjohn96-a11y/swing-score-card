import { ALL_GOLFERS_BALL_SPEED, ballSpeedDistributionForAge, ballSpeedPercentile } from "./speed";

export function speedStories(speed: number, age?: number) {
  const all = ballSpeedPercentile(speed, ALL_GOLFERS_BALL_SPEED.mean, ALL_GOLFERS_BALL_SPEED.sd);
  const group = age ? ballSpeedDistributionForAge(age) : undefined;
  const showAll = !group || all >= ballSpeedPercentile(speed, group.mean, group.sd);
  return ["hcp", "age", ...(showAll ? ["all"] : []), "distance", "level"];
}
