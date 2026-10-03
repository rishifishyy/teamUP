export function freePassesLeft(user, now = Date.now()) {
  const used = (user?.postsCount || 0) + (user?.invitesCount || 0);
  if (user?.freePassesRefillAt && new Date(user.freePassesRefillAt).getTime() <= now) return 2;
  return Math.max(0, 2 - used);
}

export function freePassRefillMessage(user) {
  if (user?.freePassesRefillAt && freePassesLeft(user) === 0) {
    const date = new Date(user.freePassesRefillAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    return `Your 2 free passes refill on ${date}. Go VIP for unlimited matching.`;
  }
  return 'Both free passes refill 14 days after your second successful match.';
}
