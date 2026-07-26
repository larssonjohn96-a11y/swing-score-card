export type DiaryEntry = {
  id: string;
  /** ISO-datum, YYYY-MM-DD */
  date: string;
  /** kategorislug */
  category: string;
  minutes: number;
  note: string;
};

const KEY = "golf-diary-entries-v1";

export function loadDiary(): DiaryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as DiaryEntry[]) : [];
    if (!Array.isArray(parsed)) return [];
    return [...parsed].sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

function persist(entries: DiaryEntry[]) {
  window.localStorage.setItem(KEY, JSON.stringify(entries));
  return [...entries].sort((a, b) => b.date.localeCompare(a.date));
}

export function saveDiaryEntry(input: Omit<DiaryEntry, "id">): DiaryEntry[] {
  const entry: DiaryEntry = { ...input, id: crypto.randomUUID() };
  return persist([...loadDiary(), entry]);
}

export function deleteDiaryEntry(id: string): DiaryEntry[] {
  return persist(loadDiary().filter((e) => e.id !== id));
}

export function diaryStats(entries: DiaryEntry[]) {
  const minutes = entries.reduce((a, b) => a + b.minutes, 0);
  return {
    sessions: entries.length,
    minutes,
    hours: minutes / 60,
  };
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
