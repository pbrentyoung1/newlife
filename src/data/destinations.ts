export const destinations = {
  publicHome: "https://www.newlifespring.org",
  churchCenter: "",
  churchCenterGiving: "",
  churchCenterEvents: "",
  churchCenterGroups: "",
  churchCenterConnect: "",
  youtubeChannel: "",
  youtubePlaylists: "",
  live: "https://live.newlifespring.org",
  school: "https://www.newlifeccs.org",
  facebook: "https://www.facebook.com/newlifecrc",
} as const;

export type DestinationKey = keyof typeof destinations;

export function destination(key: DestinationKey): string | undefined {
  return destinations[key] || undefined;
}
