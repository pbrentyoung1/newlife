export const destinations = {
  publicHome: "https://www.newlifespring.org",
  churchCenter: "",
  churchCenterGiving: "",
  churchCenterEvents: "",
  churchCenterGroups: "",
  churchCenterConnect: "",
  youtubeChannel: "https://www.youtube.com/@NewLifeSpring",
  youtubePlaylists: "https://www.youtube.com/@NewLifeSpring/playlists",
  live: "https://www.youtube.com/@NewLifeSpring/live",
  school: "https://www.newlifeccs.org",
  facebook: "https://www.facebook.com/newlifecrc",
} as const;

export type DestinationKey = keyof typeof destinations;

export function destination(key: DestinationKey): string | undefined {
  return destinations[key] || undefined;
}
