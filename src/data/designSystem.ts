export type DesignToken = {
  name: string;
  cssVar: `--${string}`;
  value: string;
  role?: string;
  tone?: "light" | "dark";
};

export const colorTokens = [
  { name: "Primary Blue", cssVar: "--nl-color-blue", value: "#2F5D7C", role: "Action, clarity, and trust", tone: "dark" },
  { name: "Sanctuary White", cssVar: "--nl-color-paper", value: "#F7F5F1", role: "Paper-like page background", tone: "light" },
  { name: "Stone Ink", cssVar: "--nl-color-ink", value: "#3E474D", role: "Primary text", tone: "dark" },
  { name: "Soft Slate", cssVar: "--nl-color-slate", value: "#69767D", role: "Secondary text", tone: "dark" },
  { name: "Quiet Line", cssVar: "--nl-color-line", value: "#D8D4CD", role: "Borders and dividers", tone: "light" },
  { name: "Garden Sage", cssVar: "--nl-color-sage", value: "#7E8D7A", role: "Community and growth", tone: "dark" },
  { name: "Clay Hearth", cssVar: "--nl-color-clay", value: "#C47A63", role: "Story, warmth, and humanity", tone: "dark" },
  { name: "Harvest Gold", cssVar: "--nl-color-gold", value: "#B79A5B", role: "Significance and depth", tone: "dark" },
  { name: "Dusty Cedar", cssVar: "--nl-color-cedar", value: "#8A6662", role: "Reflection and pastoral warmth", tone: "dark" },
] as const satisfies readonly DesignToken[];

export const surfaceTokens = [
  { name: "Surface", cssVar: "--nl-color-surface", value: "#FFFEFA" },
  { name: "Blue wash", cssVar: "--nl-color-wash-blue", value: "#E6EEF3" },
  { name: "Sage wash", cssVar: "--nl-color-wash-sage", value: "#E8EEE7" },
  { name: "Clay wash", cssVar: "--nl-color-wash-clay", value: "#F4E6E1" },
  { name: "Gold wash", cssVar: "--nl-color-wash-gold", value: "#F2EBDD" },
] as const satisfies readonly DesignToken[];

export const darkColorTokens = [
  { name: "Main background", cssVar: "--nl-dark-background", value: "#1F2A30" },
  { name: "Elevated surface", cssVar: "--nl-dark-surface", value: "#28343B" },
  { name: "Deep surface", cssVar: "--nl-dark-deep", value: "#182126" },
  { name: "Primary text", cssVar: "--nl-dark-text", value: "#F4F1EA" },
  { name: "Secondary text", cssVar: "--nl-dark-text-soft", value: "#C7C1B7" },
  { name: "Primary button", cssVar: "--nl-dark-button", value: "#5E88A5" },
  { name: "Divider", cssVar: "--nl-dark-border", value: "#425059" },
  { name: "Sage accent", cssVar: "--nl-dark-sage", value: "#93A58F" },
  { name: "Clay accent", cssVar: "--nl-dark-clay", value: "#D39A88" },
  { name: "Gold accent", cssVar: "--nl-dark-gold", value: "#C9B178" },
] as const satisfies readonly DesignToken[];

export const typographyTokens = [
  { name: "Heading", cssVar: "--nl-font-heading", value: '"IBM Plex Serif", Georgia, serif', role: "Display and headings" },
  { name: "Body", cssVar: "--nl-font-body", value: '"IBM Plex Sans", Arial, sans-serif', role: "Reading and interface copy" },
  { name: "Label", cssVar: "--nl-font-mono", value: '"IBM Plex Mono", monospace', role: "Eyebrows and technical cues" },
  { name: "Human accent", cssVar: "--nl-font-hand", value: '"Homemade Apple", cursive', role: "Restrained handwritten emphasis" },
] as const satisfies readonly DesignToken[];

export const spacingTokens = [
  { name: "1", cssVar: "--nl-space-1", value: "0.25rem", role: "4px" },
  { name: "2", cssVar: "--nl-space-2", value: "0.5rem", role: "8px" },
  { name: "3", cssVar: "--nl-space-3", value: "0.75rem", role: "12px" },
  { name: "4", cssVar: "--nl-space-4", value: "1rem", role: "16px" },
  { name: "5", cssVar: "--nl-space-5", value: "1.25rem", role: "20px" },
  { name: "6", cssVar: "--nl-space-6", value: "1.5rem", role: "24px" },
  { name: "8", cssVar: "--nl-space-8", value: "2rem", role: "32px" },
  { name: "10", cssVar: "--nl-space-10", value: "2.5rem", role: "40px" },
  { name: "12", cssVar: "--nl-space-12", value: "3rem", role: "48px" },
  { name: "16", cssVar: "--nl-space-16", value: "4rem", role: "64px" },
  { name: "20", cssVar: "--nl-space-20", value: "5rem", role: "80px" },
] as const satisfies readonly DesignToken[];

export const frameworkTokens = [
  { name: "Content width", cssVar: "--nl-layout-content", value: "76rem" },
  { name: "Reading width", cssVar: "--nl-layout-reading", value: "46rem" },
  { name: "Control radius", cssVar: "--nl-radius-control", value: "0.25rem" },
  { name: "Card shadow", cssVar: "--nl-shadow-card", value: "0 18px 45px rgb(62 71 77 / 0.1)" },
  { name: "Motion fast", cssVar: "--nl-motion-fast", value: "240ms" },
  { name: "Motion-standard", cssVar: "--nl-motion-standard", value: "420ms" },
] as const satisfies readonly DesignToken[];

export const allDesignTokens = [
  ...colorTokens,
  ...surfaceTokens,
  ...darkColorTokens,
  ...typographyTokens,
  ...spacingTokens,
  ...frameworkTokens,
] as const;

export const designTokenStyle = allDesignTokens
  .map((token) => `${token.cssVar}:${token.value}`)
  .join(";");
