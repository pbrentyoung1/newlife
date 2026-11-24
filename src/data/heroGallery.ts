export const heroGallery = {
  defaultTheme: "sunday",
  intervalMs: 6500,
  themes: [
    {
      id: "sunday",
      label: "Sunday at New Life",
      description: "A thoughtful, welcoming place to worship and ask questions.",
      accent: "blue",
      imageLabels: ["Welcome", "Worship", "Conversation", "New Life in Spring"],
    },
    {
      id: "together",
      label: "Life Together",
      description: "Friendship, prayer, meals, and the ordinary work of following Jesus.",
      accent: "sage",
      imageLabels: ["Shared table", "All ages", "Prayer", "Everyday friendship"],
    },
    {
      id: "serving",
      label: "Serving Spring",
      description: "Showing up for our neighbors through lasting local relationships.",
      accent: "clay",
      imageLabels: ["Our neighborhood", "Local partners", "Hands at work", "Spring, Texas"],
    },
  ],
} as const;
