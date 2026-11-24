export const primaryNavigation = [
  { label: "Visit", href: "/visit/" },
  {
    label: "About",
    href: "/about/",
    children: [
      { label: "About New Life", description: "Our identity, mission, and story", href: "/about/", icon: "church", tone: "community" },
      { label: "What we believe", description: "Historic Christian faith", href: "/beliefs/", icon: "book", tone: "teaching" },
      { label: "Leadership", description: "People who serve New Life", href: "/leadership/", icon: "users", tone: "reflection" },
    ],
  },
  { label: "Faith", href: "/faith/" },
  {
    label: "Connect",
    href: "/connect/",
    children: [
      { label: "Connect", description: "Relationships and next steps", href: "/connect/", icon: "heart", tone: "community" },
      { label: "Children", description: "A thoughtful welcome for families", href: "/children/", icon: "child", tone: "teaching" },
      { label: "Youth", description: "Faith, friendship, and growing up", href: "/youth/", icon: "youth", tone: "action" },
      { label: "Preschool", description: "Church and school in one community", href: "/preschool/", icon: "school", tone: "human" },
      { label: "Community", description: "Serving Spring together", href: "/community/", icon: "serve", tone: "community" },
    ],
  },
  { label: "Watch", href: "/watch/" },
] as const;

export const footerNavigation = [
  { label: "Leadership", href: "/leadership/" },
  { label: "Children", href: "/children/" },
  { label: "Youth", href: "/youth/" },
  { label: "Preschool", href: "/preschool/" },
  { label: "Community", href: "/community/" },
  { label: "Contact", href: "/contact/" },
  { label: "Privacy", href: "/privacy/" },
] as const;
