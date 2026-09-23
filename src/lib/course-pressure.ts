export function coursePressure(
  names: [string, string],
  format: "match" | "stroke",
  diff: number,
  played: number,
  holes: number,
): string | null {
  const left = holes - played;
  if (left <= 0) return null;
  if (format === "stroke") return left === 1 ? "Sista hålet – lägst totalresultat vinner." : null;
  if (Math.abs(diff) > left) return null;
  if (diff === 0) return left === 1 ? "Sista hålet – vinn hålet för att vinna matchen." : null;
  const leader = names[diff > 0 ? 0 : 1],
    trailer = names[diff > 0 ? 1 : 0];
  if (Math.abs(diff) === left) return `${trailer} måste vinna hålet för att hålla matchen vid liv.`;
  if (Math.abs(diff) === left - 1) return `${leader} kan avgöra matchen på det här hålet.`;
  return null;
}
