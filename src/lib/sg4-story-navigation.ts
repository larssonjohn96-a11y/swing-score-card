export type StoryPosition = { group: number; slide: number };
export type StoryPoint = { x: number; y: number; time: number };

/** Move between stories and groups. Advancing past the last story closes it. */
export function moveStory(
  lengths: readonly number[],
  position: StoryPosition,
  direction: -1 | 1,
): StoryPosition | null {
  const length = lengths[position.group];
  if (!length || position.slide < 0 || position.slide >= length) return null;
  const slide = position.slide + direction;
  if (slide >= 0 && slide < length) return { ...position, slide };
  for (let group = position.group + direction; group >= 0 && group < lengths.length; group += direction) {
    if (lengths[group] > 0) return { group, slide: direction > 0 ? 0 : lengths[group] - 1 };
  }
  return direction > 0 ? null : position;
}

/** Downward, predominantly vertical movement only; tiny/sideways drags never close. */
export function shouldDismissStory(start: StoryPoint, end: StoryPoint, height: number): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dy <= 0 || dy <= Math.abs(dx) * 1.2) return false;
  const threshold = Math.max(72, Math.min(160, height * 0.16));
  const velocity = dy / Math.max(1, end.time - start.time);
  return dy >= threshold || (dy >= 48 && velocity >= 0.65);
}

export function isStoryDrag(start: StoryPoint, end: StoryPoint): boolean {
  return Math.hypot(end.x - start.x, end.y - start.y) > 8;
}
