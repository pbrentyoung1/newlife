export const heroGallery = {
  defaultTheme: "sunday",
  intervalMs: 15000,
  transitionMs: {
    exit: 520,
    beat: 240,
    enter: 760,
  },
  layouts: [
    [
      { x: "1%", y: "2.75rem", width: "57%", height: "19.5rem", rotation: "-5deg", z: "2" },
      { x: "60%", y: "0", width: "35%", height: "9.5rem", rotation: "6deg", z: "4" },
      { x: "55%", y: "11.5rem", width: "42%", height: "11.5rem", rotation: "-4deg", z: "3" },
      { x: "8%", y: "22.75rem", width: "31%", height: "8.25rem", rotation: "7deg", z: "5" },
      { x: "42%", y: "24rem", width: "34%", height: "7.75rem", rotation: "-8deg", z: "1" },
    ],
    [
      { x: "4%", y: "2rem", width: "54%", height: "18.75rem", rotation: "-8deg", z: "3" },
      { x: "58%", y: "1rem", width: "32%", height: "9rem", rotation: "4deg", z: "5" },
      { x: "52%", y: "11.25rem", width: "44%", height: "11.25rem", rotation: "-7deg", z: "2" },
      { x: "12%", y: "22rem", width: "29%", height: "7.75rem", rotation: "9deg", z: "4" },
      { x: "43%", y: "23.5rem", width: "35%", height: "8.25rem", rotation: "-3deg", z: "1" },
    ],
    [
      { x: "1%", y: "2.5rem", width: "56%", height: "19rem", rotation: "-2deg", z: "2" },
      { x: "61%", y: "0.25rem", width: "30%", height: "8.75rem", rotation: "8deg", z: "4" },
      { x: "55%", y: "10.25rem", width: "41%", height: "12rem", rotation: "-6deg", z: "5" },
      { x: "10%", y: "21.75rem", width: "27%", height: "7.5rem", rotation: "11deg", z: "3" },
      { x: "39%", y: "23.5rem", width: "36%", height: "7.5rem", rotation: "-10deg", z: "1" },
    ],
    [
      { x: "3%", y: "1.5rem", width: "60%", height: "19.75rem", rotation: "-7deg", z: "1" },
      { x: "62%", y: "0.75rem", width: "31%", height: "8.75rem", rotation: "5deg", z: "5" },
      { x: "54%", y: "11rem", width: "43%", height: "11rem", rotation: "-2deg", z: "4" },
      { x: "13%", y: "22.5rem", width: "31%", height: "8rem", rotation: "6deg", z: "3" },
      { x: "46%", y: "23rem", width: "31%", height: "7.75rem", rotation: "-12deg", z: "2" },
    ],
  ],
  themes: [
    {
      id: "sunday",
      label: "Sunday at New Life",
      description: "A thoughtful, welcoming place to worship and ask questions.",
      accent: "blue",
      imageLabels: ["Welcome", "Worship", "Conversation", "New Life in Spring", "Sunday morning"],
    },
    {
      id: "together",
      label: "Life Together",
      description: "Friendship, prayer, meals, and the ordinary work of following Jesus.",
      accent: "sage",
      imageLabels: ["Shared table", "All ages", "Prayer", "Everyday friendship", "Life together"],
    },
    {
      id: "serving",
      label: "Serving Spring",
      description: "Showing up for our neighbors through lasting local relationships.",
      accent: "clay",
      imageLabels: ["Our neighborhood", "Local partners", "Hands at work", "Spring, Texas", "Good neighbors"],
    },
  ],
} as const;
