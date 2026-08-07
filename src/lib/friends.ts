/**
 * "Kompisar" att jämföra sig mot i spindeldiagrammet. Appen har inget
 * social-backend/spelarkatalog, så det här är manuellt inlagda referenser
 * (namn + handicap) – inte riktiga, sökbara andra appanvändare.
 */

export type Friend = {
  id: string;
  name: string;
  handicap: number;
};

const KEY = "golf-friends-v1";

export function loadFriends(): Friend[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Friend[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(friends: Friend[]) {
  window.localStorage.setItem(KEY, JSON.stringify(friends));
  return friends;
}

export function addFriend(name: string, handicap: number): Friend[] {
  const friend: Friend = { id: crypto.randomUUID(), name: name.trim(), handicap };
  return persist([...loadFriends(), friend]);
}

export function removeFriend(id: string): Friend[] {
  return persist(loadFriends().filter((f) => f.id !== id));
}
