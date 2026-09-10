export function strokeWinner(
  blueStrokes?: number,
  redStrokes?: number,
): "blue" | "red" | "tie" | null {
  if (typeof blueStrokes !== "number" || typeof redStrokes !== "number") return null;
  if (blueStrokes < redStrokes) return "blue";
  if (redStrokes < blueStrokes) return "red";
  return "tie";
}
