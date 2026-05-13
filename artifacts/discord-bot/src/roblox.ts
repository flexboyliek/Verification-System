const GAMEPASS_API_BASE = "https://inventory.roblox.com/v1";

export async function getRobloxUserId(username: string): Promise<number | null> {
  const res = await fetch("https://users.roblox.com/v1/usernames/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { data: { id: number; name: string }[] };
  if (!data.data || data.data.length === 0) return null;

  return data.data[0].id;
}

export async function getRobloxAvatar(userId: number): Promise<string | null> {
  const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as {
    data: { targetId: number; state: string; imageUrl: string }[];
  };

  if (!data.data || data.data.length === 0) return null;
  return data.data[0].imageUrl ?? null;
}

export async function ownsGamePass(
  userId: number,
  gamePassId: number
): Promise<boolean> {
  const url = `${GAMEPASS_API_BASE}/users/${userId}/items/GamePass/${gamePassId}`;
  const res = await fetch(url);
  if (!res.ok) return false;

  const data = (await res.json()) as { data: unknown[] };
  return Array.isArray(data.data) && data.data.length > 0;
}

export async function checkAnyGamePass(
  userId: number,
  gamePassIds: number[]
): Promise<boolean> {
  const results = await Promise.all(
    gamePassIds.map((id) => ownsGamePass(userId, id))
  );
  return results.some(Boolean);
}
