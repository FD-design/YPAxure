// Brand icon catalog inspired by https://github.com/tandpfun/skill-icons.
//
// We can't render real SVG logos in Axvg (Axure's text widgets are restricted to BMP
// chars in the Inter font, no SVG paths, no image embedding yet). So each icon here is
// a "brand chip" — a rounded rectangle filled with the brand's color, with a short
// text label centered inside (TS / JS / Py / Re / ...). The chip is recognizable by
// color + label combination, which is enough for UI mockups.
//
// Usage:
//   icon("react",  { x: 16, y: 32, size: 48 })           → returns widgets for one icon
//   iconRow(["react","ts","tailwind"], { x: 16, y: 32 }) → returns widgets for a row
//
// Default chip is 48×48 with rounded corners ~6px (matches the skillicons.dev look).

import { hex, rect, text, type Color } from "./axvg-build.js";

const W = hex("#FFFFFF");
const K = hex("#0B0B0B");

interface IconDef {
  color: Color;
  label: string;
  /** Optional foreground/text color override. Default: white. */
  fg?: Color;
}

/**
 * Curated catalog of ~70 most-used skill-icons slugs.
 * Slugs match https://github.com/tandpfun/skill-icons exactly so callers can
 * cross-reference the original library.
 */
export const iconCatalog: Record<string, IconDef> = {
  // ── Languages
  c:          { color: hex("#A8B9CC"), label: "C",    fg: K },
  cpp:        { color: hex("#00599C"), label: "C++" },
  cs:         { color: hex("#239120"), label: "C#" },
  js:         { color: hex("#F7DF1E"), label: "JS",   fg: K },
  ts:         { color: hex("#3178C6"), label: "TS" },
  py:         { color: hex("#3776AB"), label: "Py" },
  java:       { color: hex("#E76F00"), label: "Jv" },
  kotlin:     { color: hex("#7F52FF"), label: "Kt" },
  go:         { color: hex("#00ADD8"), label: "Go" },
  rust:       { color: hex("#DEA584"), label: "Rs",   fg: K },
  ruby:       { color: hex("#CC342D"), label: "Rb" },
  php:        { color: hex("#777BB4"), label: "PHP" },
  swift:      { color: hex("#FA7343"), label: "Sw" },
  dart:       { color: hex("#0175C2"), label: "Dt" },
  scala:      { color: hex("#DC322F"), label: "Sc" },
  r:          { color: hex("#276DC3"), label: "R" },
  bash:       { color: hex("#4EAA25"), label: "Sh" },
  powershell: { color: hex("#5391FE"), label: "PS" },
  html:       { color: hex("#E34F26"), label: "5" },
  css:        { color: hex("#1572B6"), label: "3" },
  sass:       { color: hex("#CC6699"), label: "Sass" },
  graphql:    { color: hex("#E10098"), label: "GQL" },
  wasm:       { color: hex("#654FF0"), label: "WA" },
  md:         { color: K,              label: "MD" },
  latex:      { color: hex("#008080"), label: "TeX" },
  solidity:   { color: hex("#363636"), label: "Sol" },

  // ── Frameworks & libraries
  react:      { color: hex("#61DAFB"), label: "⚛",   fg: K }, // atom ⚛
  vue:        { color: hex("#4FC08D"), label: "Vue" },
  angular:    { color: hex("#DD0031"), label: "Ng" },
  svelte:     { color: hex("#FF3E00"), label: "Svl" },
  solidjs:    { color: hex("#2C4F7C"), label: "Sol" },
  nextjs:     { color: K,              label: "N" },
  nuxtjs:     { color: hex("#00DC82"), label: "Nu",   fg: K },
  remix:      { color: K,              label: "Rmx" },
  astro:      { color: hex("#FF5D01"), label: "Ast" },
  gatsby:     { color: hex("#663399"), label: "G" },
  nodejs:     { color: hex("#5FA04E"), label: "Node" },
  deno:       { color: K,              label: "Deno" },
  bun:        { color: hex("#FBF0DF"), label: "Bun",  fg: K },
  express:    { color: K,              label: "Ex" },
  nestjs:     { color: hex("#E0234E"), label: "Nest" },
  fastapi:    { color: hex("#009688"), label: "FA" },
  flask:      { color: K,              label: "Fl" },
  django:     { color: hex("#092E20"), label: "Dj" },
  rails:      { color: hex("#CC0000"), label: "Rl" },
  laravel:    { color: hex("#FF2D20"), label: "Lar" },
  spring:     { color: hex("#6DB33F"), label: "Sp" },
  dotnet:     { color: hex("#512BD4"), label: ".NET" },
  flutter:    { color: hex("#02569B"), label: "Fl" },
  tailwind:   { color: hex("#06B6D4"), label: "TW" },
  bootstrap:  { color: hex("#7952B3"), label: "BS" },
  materialui: { color: hex("#007FFF"), label: "MUI" },
  redux:      { color: hex("#764ABC"), label: "Rdx" },
  threejs:    { color: K,              label: "3JS" },
  vite:       { color: hex("#646CFF"), label: "Vt" },

  // ── Design tools
  figma:      { color: hex("#F24E1E"), label: "F" },
  ps:         { color: hex("#31A8FF"), label: "Ps" },
  ai:         { color: hex("#FF9A00"), label: "Ai",   fg: K },
  xd:         { color: hex("#FF61F6"), label: "XD" },
  blender:    { color: hex("#E87D0D"), label: "Bl" },
  unity:      { color: K,              label: "U" },
  unreal:     { color: hex("#0E1128"), label: "UE" },

  // ── Productivity / IDE
  vscode:     { color: hex("#007ACC"), label: "VS" },
  idea:       { color: K,              label: "IJ" },
  vim:        { color: hex("#019733"), label: "Vim" },
  obsidian:   { color: hex("#7C3AED"), label: "Ob" },
  notion:     { color: K,              label: "N" },
  postman:    { color: hex("#FF6C37"), label: "PM" },
  git:        { color: hex("#F05032"), label: "Git" },
  github:     { color: hex("#181717"), label: "GH" },
  gitlab:     { color: hex("#FC6D26"), label: "GL" },
  docker:     { color: hex("#2496ED"), label: "Dkr" },
  kubernetes: { color: hex("#326CE5"), label: "K8s" },

  // ── Cloud / infra
  aws:        { color: hex("#FF9900"), label: "AWS",  fg: K },
  gcp:        { color: hex("#4285F4"), label: "GCP" },
  azure:      { color: hex("#0078D4"), label: "Az" },
  cloudflare: { color: hex("#F38020"), label: "CF" },
  vercel:     { color: K,              label: "▲" }, // U+25B2 BLACK UP-POINTING TRIANGLE
  netlify:    { color: hex("#00C7B7"), label: "Net" },
  firebase:   { color: hex("#FFCA28"), label: "Fb",   fg: K },
  supabase:   { color: hex("#3ECF8E"), label: "Sb",   fg: K },
  mongodb:    { color: hex("#47A248"), label: "Mgo" },
  postgres:   { color: hex("#4169E1"), label: "PG" },
  mysql:      { color: hex("#4479A1"), label: "SQL" },
  redis:      { color: hex("#DC382D"), label: "Rds" },
  nginx:      { color: hex("#009639"), label: "ngx" },
  linux:      { color: hex("#FCC624"), label: "Lnx",  fg: K },
  ubuntu:     { color: hex("#E95420"), label: "Ub" },

  // ── Social / brand (also referenced in palettes.brand)
  discord:    { color: hex("#5865F2"), label: "Dc" },
  twitter:    { color: hex("#1DA1F2"), label: "Tw" },
  instagram:  { color: hex("#E4405F"), label: "IG" },
  linkedin:   { color: hex("#0A66C2"), label: "in" },
  gmail:      { color: hex("#EA4335"), label: "Gm" },
  stackoverflow: { color: hex("#F58025"), label: "SO" },
  devto:      { color: K,              label: "dev" },
  mastodon:   { color: hex("#6364FF"), label: "Mst" },
  apple:      { color: K,              label: "" }, //  Apple PUA glyph; may or may not render
  wechat:     { color: hex("#07C160"), label: "微" },
  qq:         { color: hex("#1E9DEC"), label: "Q" },
  weibo:      { color: hex("#E84B47"), label: "博" },
};

export interface IconOpts {
  x: number;
  y: number;
  /** Side length in px. Default 48 (matches skillicons.dev). */
  size?: number;
  /** Corner style: "square" = 4px corners, "rounded" = ~size/8 corners (default), "circle" = full. */
  rounded?: "square" | "rounded" | "circle";
}

/** Render a brand-icon chip. Returns the widgets to spread into a frame's children. */
export function icon(slug: string, opts: IconOpts) {
  const size = opts.size ?? 48;
  const corners =
    opts.rounded === "circle"
      ? 999
      : opts.rounded === "square"
        ? 4
        : Math.max(4, Math.round(size / 8));
  const def = iconCatalog[slug];
  if (!def) {
    // Unknown slug → render a neutral placeholder chip with the slug's first 2 chars.
    return [
      rect({ x: opts.x, y: opts.y, w: size, h: size, fill: hex("#E5E7EB"), corners, name: `icon-${slug}-missing` }),
      text({
        x: opts.x, y: opts.y + Math.round(size / 2 - size / 6),
        w: size, h: Math.round(size / 3),
        content: slug.substring(0, 2).toUpperCase(),
        size: Math.round(size / 3.5),
        color: hex("#6B7280"),
        typeface: "Inter - Bold",
        weight: 700,
        align: "center",
      }),
    ];
  }
  const fg = def.fg ?? W;
  // Pick label font size based on label length. Shorter labels get bigger text.
  const labelLen = [...def.label].length; // codepoint count, not char count
  const fontSize = Math.round(
    labelLen <= 1 ? size * 0.5
    : labelLen <= 2 ? size * 0.42
    : labelLen <= 3 ? size * 0.32
    : size * 0.26,
  );
  const textY = opts.y + Math.round(size / 2 - fontSize * 0.65);
  return [
    rect({ x: opts.x, y: opts.y, w: size, h: size, fill: def.color, corners, name: `icon-${slug}` }),
    text({
      x: opts.x, y: textY,
      w: size, h: Math.round(fontSize * 1.4),
      content: def.label,
      size: fontSize,
      color: fg,
      typeface: "Inter - Bold",
      weight: 700,
      align: "center",
    }),
  ];
}

export interface IconRowOpts {
  x: number;
  y: number;
  size?: number;
  /** Gap between icons in px. Default 8. */
  spacing?: number;
  rounded?: IconOpts["rounded"];
}

/** Render a horizontal row of brand icons. Returns all widgets in one flat array. */
export function iconRow(slugs: string[], opts: IconRowOpts) {
  const size = opts.size ?? 48;
  const spacing = opts.spacing ?? 8;
  const widgets: any[] = [];
  let x = opts.x;
  for (const slug of slugs) {
    widgets.push(...icon(slug, { x, y: opts.y, size, rounded: opts.rounded }));
    x += size + spacing;
  }
  return widgets;
}

/** Render a grid of brand icons. `columns` controls how many per row. */
export function iconGrid(slugs: string[], opts: IconRowOpts & { columns: number; rowSpacing?: number }) {
  const size = opts.size ?? 48;
  const spacing = opts.spacing ?? 8;
  const rowSpacing = opts.rowSpacing ?? spacing;
  const widgets: any[] = [];
  for (let i = 0; i < slugs.length; i++) {
    const col = i % opts.columns;
    const row = Math.floor(i / opts.columns);
    const x = opts.x + col * (size + spacing);
    const y = opts.y + row * (size + rowSpacing);
    widgets.push(...icon(slugs[i]!, { x, y, size, rounded: opts.rounded }));
  }
  return widgets;
}

/** List every supported slug — for discoverability / autocomplete. */
export function listIcons(): string[] {
  return Object.keys(iconCatalog);
}
