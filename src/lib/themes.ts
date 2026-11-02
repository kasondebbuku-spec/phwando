// Each public event page uses one fixed palette, picked by the organiser.
export type Theme = {
  name: string;
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  accent: string;
  line: string;
  btnInk: string;
};

export const THEMES: Record<string, Theme> = {
  ruby: { name: "Ruby & gold", bg: "#2a0b12", panel: "#3a1019", ink: "#f6ece0", muted: "#c9ae9f", accent: "#d8b46a", line: "rgba(216,180,106,.3)", btnInk: "#2a0b12" },
  ivory: { name: "Ivory", bg: "#f3efe7", panel: "#fbf9f4", ink: "#2c2a26", muted: "#776f62", accent: "#8a6a35", line: "rgba(138,106,53,.28)", btnInk: "#ffffff" },
  emerald: { name: "Emerald", bg: "#0d2a22", panel: "#123a2f", ink: "#eef5f0", muted: "#a9c3b7", accent: "#e2c27a", line: "rgba(226,194,122,.28)", btnInk: "#0d2a22" },
  slate: { name: "Slate", bg: "#eef1f5", panel: "#ffffff", ink: "#18202b", muted: "#5b6676", accent: "#1f5fbf", line: "rgba(31,95,191,.22)", btnInk: "#ffffff" },
  dusk: { name: "Dusk", bg: "#1b1830", panel: "#24213f", ink: "#efeaf7", muted: "#b0a8c8", accent: "#f0a36b", line: "rgba(240,163,107,.28)", btnInk: "#1b1830" },
};

export type Template = { id: string; label: string; theme: string; kicker: string; wall: string };

export const TEMPLATES: Template[] = [
  { id: "birthday", label: "Birthday", theme: "ruby", kicker: "Birthday celebration", wall: "Birthday messages" },
  { id: "wedding", label: "Wedding", theme: "ivory", kicker: "Wedding reception", wall: "Wishes for the couple" },
  { id: "gala", label: "Gala dinner", theme: "emerald", kicker: "Gala dinner", wall: "Guest book" },
  { id: "conference", label: "Conference", theme: "slate", kicker: "Conference", wall: "Questions for speakers" },
  { id: "church", label: "Church event", theme: "dusk", kicker: "Church gathering", wall: "Prayers & blessings" },
  { id: "party", label: "Party", theme: "dusk", kicker: "You're invited", wall: "Messages" },
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[TEMPLATES.length - 1];
export const getTheme = (id: string) => THEMES[id] ?? THEMES.ruby;

export function themeStyle(id: string): React.CSSProperties {
  const t = getTheme(id);
  return {
    "--e-bg": t.bg,
    "--e-panel": t.panel,
    "--e-ink": t.ink,
    "--e-muted": t.muted,
    "--e-accent": t.accent,
    "--e-line": t.line,
    "--e-btn-ink": t.btnInk,
  } as React.CSSProperties;
}
