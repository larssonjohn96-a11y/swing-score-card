export function getPlayerPressureNotice(matchDiff: number, holesRemaining: number, botName: string) {
  if (holesRemaining <= 0) return null;

  if (matchDiff === 0 && holesRemaining === 1) {
    return "Sista hålet avgör matchen.";
  }

  if (matchDiff < 0) {
    const deficit = Math.abs(matchDiff);
    if (deficit === holesRemaining) {
      return `${botName} kan avgöra matchen nu. Du måste vinna hålet.`;
    }
    if (deficit === holesRemaining - 1 && deficit > 0) {
      return "Du måste vinna eller dela hålet för att hålla matchen vid liv.";
    }
  }

  return null;
}
