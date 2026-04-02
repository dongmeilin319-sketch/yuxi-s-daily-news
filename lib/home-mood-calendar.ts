export type MoodId = "happy" | "calm" | "sad" | "nervous" | "blessed";

export const MOOD_OPTIONS: readonly { id: MoodId; label: string; emoji: string }[] = [
  { id: "happy", label: "\u5f00\u5fc3", emoji: "\uD83D\uDE0A" },
  { id: "calm", label: "\u5e73\u9759", emoji: "\uD83D\uDE0C" },
  { id: "sad", label: "\u96be\u8fc7", emoji: "\uD83D\uDE22" },
  { id: "nervous", label: "\u7d27\u5f20", emoji: "\uD83D\uDE30" },
  { id: "blessed", label: "\u5e78\u798f", emoji: "\uD83E\uDD70" },
] as const;

const validIds = new Set<MoodId>(MOOD_OPTIONS.map((o) => o.id));

export function isValidMoodId(id: string): id is MoodId {
  return validIds.has(id as MoodId);
}

export function moodEmoji(id: MoodId): string {
  return MOOD_OPTIONS.find((o) => o.id === id)?.emoji ?? "\u00b7";
}

export function moodLabel(id: MoodId): string {
  return MOOD_OPTIONS.find((o) => o.id === id)?.label ?? id;
}
