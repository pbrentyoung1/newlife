import type { DestinationKey } from "./destinations";

export type PageTone = "blue" | "sage" | "clay" | "gold" | "cedar";

export type PageNextStep = {
  eyebrow: string;
  title: string;
  description: string;
  actions: readonly {
    label: string;
    destination: DestinationKey;
  }[];
};

export type SitePage = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  note: string;
  tone: PageTone;
  sections: readonly string[];
  nextStep?: PageNextStep;
};

export const sitePages = [
  { slug: "visit", eyebrow: "Plan a visit", title: "Your first Sunday", description: "A clear, practical guide to arriving, worshiping, and finding help at New Life.", note: "Questions are welcome here.", tone: "blue", sections: ["When and where", "Parking and entrances", "What the service is like", "Children and accessibility", "Meet someone before you arrive"] },
  { slug: "about", eyebrow: "About New Life", title: "Following Jesus together", description: "New Life’s identity, mission, story, values, and Christian Reformed roots—written for people who do not already know us.", note: "A smaller church where people can be known.", tone: "sage", sections: ["Who we are", "Our mission and values", "Our story", "Christian Reformed", "What shapes our life together"] },
  { slug: "beliefs", eyebrow: "What we believe", title: "Historic Christian faith", description: "An accessible, reviewed account of the Gospel, Scripture, the Church, and our Reformed understanding of faith.", note: "Rooted, thoughtful, and centered on Jesus.", tone: "gold", sections: ["Jesus and the Gospel", "Scripture", "Grace and discipleship", "The Church", "Christian Reformed tradition"] },
  { slug: "faith", eyebrow: "Explore faith", title: "Bring your questions", description: "A welcoming place to learn about Jesus, Christianity, and what a next step might look like.", note: "You do not need to have it all figured out.", tone: "clay", sections: ["Who is Jesus?", "What is the Gospel?", "Questions and doubts", "Read and explore", "Talk with a person"] },
  { slug: "leadership", eyebrow: "Leadership", title: "People who serve New Life", description: "Current, verified introductions to New Life’s pastor, staff, council, and appropriate public contacts.", note: "Leadership begins with service.", tone: "cedar", sections: ["Pastor and staff", "Council", "How leadership works", "Contact"] },
  { slug: "connect", eyebrow: "Connect", title: "Share life and take a next step", description: "Stable introductions to relationships, membership, serving, and groups, with current participation handled in Church Center.", note: "Faith grows in ordinary relationships.", tone: "sage", sections: ["Groups", "Membership", "Serving", "Women", "Church Center"] },
  { slug: "children", eyebrow: "Children", title: "A thoughtful welcome for families", description: "Verified first-visit information for parents and caregivers, without overstating programs or schedules.", note: "Clear information helps families feel at home.", tone: "gold", sections: ["A first Sunday", "Ages and environments", "Check-in and safety", "Current activities", "Ask a question"] },
  { slug: "youth", eyebrow: "Youth", title: "Faith, friendship, and growing up", description: "A clear introduction for students and families, with current schedules and signups in Church Center.", note: "A place to belong, ask, and grow.", tone: "blue", sections: ["Who it is for", "What to expect", "Current gatherings", "Meet a leader"] },
  { slug: "preschool", eyebrow: "New Life Christian School", title: "Church and school in one community", description: "A concise introduction to the relationship between New Life and the school, with admissions and operations on the school’s website.", note: "Shared roots, clear responsibilities.", tone: "clay", sections: ["Our relationship", "For prospective families", "Tours and enrollment", "School website"] },
  { slug: "community", eyebrow: "Our community", title: "Serving Spring through real relationships", description: "Verified local partners, outward service, and the ways New Life participates in the life of our neighborhood.", note: "Good neighbors for the long haul.", tone: "sage", sections: ["Local relationships", "Serving opportunities", "Church planting", "How to participate"] },
  {
    slug: "watch",
    eyebrow: "Sermons and live video",
    title: "Watch on YouTube",
    description: "A curated doorway to recent messages, sermon-series playlists, and New Life’s livestream—not a duplicate media archive.",
    note: "One clear home for every message.",
    tone: "cedar",
    sections: ["Featured series", "Recent messages", "Watch live", "YouTube channel"],
    nextStep: {
      eyebrow: "New Life on YouTube",
      title: "Live services and every sermon in one place.",
      description: "Visit New Life’s official YouTube channel to watch a service live, browse sermon playlists, or catch up on recent messages.",
      actions: [
        { label: "Open YouTube", destination: "youtubeChannel" },
        { label: "Watch live", destination: "live" },
        { label: "Browse playlists", destination: "youtubePlaylists" },
      ],
    },
  },
  { slug: "contact", eyebrow: "Contact", title: "Talk with a person", description: "Verified office contact, directions, and a clear way to ask a question before you visit.", note: "A real conversation is a good next step.", tone: "blue", sections: ["Church office", "Directions", "General questions", "Prayer requests"] },
  { slug: "privacy", eyebrow: "Privacy", title: "How this website handles information", description: "A plain-language account of analytics, external destinations, forms, and the information New Life does and does not collect.", note: "Clear, restrained, and respectful.", tone: "gold", sections: ["Website analytics", "External services", "Forms", "Contact"] },
] as const satisfies readonly SitePage[];
