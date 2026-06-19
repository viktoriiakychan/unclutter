export function timeAgo(internalDate) {
  const ageMs = Date.now() - Number(internalDate);
  const mins = Math.floor(ageMs / (60 * 1000));
  const hours = Math.floor(ageMs / (60 * 60 * 1000));
  const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  const weeks = Math.floor(ageMs / (7 * 24 * 60 * 60 * 1000));

  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${weeks}w ago`;
}