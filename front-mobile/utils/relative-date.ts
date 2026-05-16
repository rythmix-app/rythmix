export function formatRelativeDate(date: string): string {
  const target = new Date(date).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - target);
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) {
    const diffWeeks = Math.floor(diffDays / 7);
    return `Il y a ${diffWeeks} sem.`;
  }
  if (diffDays < 365) {
    const diffMonths = Math.floor(diffDays / 30);
    return `Il y a ${diffMonths} mois`;
  }
  const diffYears = Math.floor(diffDays / 365);
  return diffYears === 1 ? "Il y a 1 an" : `Il y a ${diffYears} ans`;
}
