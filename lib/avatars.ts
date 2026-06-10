const LOCAL_AVATARS: Record<string, string> = {
  naren: "/assets/naren.png",
  etienne: "/assets/etienne.png",
  gui: "/assets/gui.png",
  hannes: "/assets/hannes.png",
  ranga: "/assets/ranga.png",
};

export function resolveAvatarUrl(
  displayName: string,
  avatarUrl: string | null | undefined
): string | undefined {
  const local = LOCAL_AVATARS[displayName.trim().toLowerCase()];
  if (local) return local;
  return avatarUrl ?? undefined;
}
