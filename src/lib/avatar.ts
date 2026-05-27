const AVATAR_COUNT = 4;

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getUserAvatarSrc(params: {
  userId?: number | string | null;
  name?: string | null;
}) {
  const key =
    params.userId != null
      ? String(params.userId)
      : (params.name ?? "").trim().toLowerCase();

  const index = key ? (hashString(key) % AVATAR_COUNT) + 1 : 1;
  return `/images/avator/avator${index}.jpg`;
}

