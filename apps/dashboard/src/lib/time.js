export function nowIso() {
  return new Date().toISOString();
}

export function estimatedRemainingMinutes({ answered = 0, visible = 0 }) {
  return Math.min(12, Math.max(1, Math.ceil(Math.max(0, visible - answered) / 4)));
}

export function relativeSaveTime(savedAt) {
  if (!savedAt) return null;
  const difference = Math.max(0, Date.now() - new Date(savedAt).getTime());
  if (difference < 60 * 1000) return 'now';
  return `${Math.floor(difference / 60000)}m`;
}
