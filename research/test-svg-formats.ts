// Try multiple clipboard format names for SVG. Between each, we'll auto-paste to Axure
// and ask the user (or screenshot) what happened.
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1F2937" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;

// Save to a tmp file so we can also test "file copy" later
const svgPath = "research/_test_search.svg";
writeFileSync(svgPath, svg);

const formats = [
  "image/svg+xml",
  "SVG",
  "image/svg",
  "Scalable Vector Graphics",
  "Drawing",
  "Vector",
];

// Test plan: just print each format. User will run them individually.
console.log(`SVG saved to ${svgPath}`);
console.log("");
console.log("Manual test commands (run one at a time, then Ctrl+V in Axure):");
console.log("");
for (const fmt of formats) {
  console.log(`  powershell -ExecutionPolicy Bypass -NoProfile -File research/test-svg-clipboard.ps1 -Format "${fmt}"`);
}
console.log("");
console.log("If none work, we fall back to SVG → PNG conversion via @resvg/resvg-js.");
