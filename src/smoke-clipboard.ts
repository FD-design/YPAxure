// Smoke test for the clipboard module. Run: npx tsx src/smoke-clipboard.ts
import { listTemplates, pasteTemplate, DEFAULT_TEMPLATE_DIR } from "./parser/clipboard.js";

console.log(`Template dir: ${DEFAULT_TEMPLATE_DIR}\n`);
const list = listTemplates();
console.log(`Found ${list.length} template(s):`);
for (const t of list) {
  console.log(`  - ${t.name}  (${t.sizeBytes} bytes, class=${t.className ?? "?"})`);
}

if (list.length === 0) {
  console.log("No templates to test paste with. Aborting.");
  process.exit(0);
}

const first = list[0]!;
const autoPaste = process.argv.includes("--auto-paste");
console.log(`\nWriting "${first.name}" to clipboard (autoPaste=${autoPaste})...`);
const res = pasteTemplate(first.name, { autoPaste });
console.log(JSON.stringify(res, null, 2));
if (autoPaste) {
  if (res.autoPaste === "ok") console.log(`\nAuto-paste sent. Check Axure — a widget should have appeared.`);
  else if (res.autoPaste === "skipped_no_axure") console.log(`\nAxure not running; clipboard set but no paste attempted.`);
} else {
  console.log(`\nClipboard now holds an Axure widget. Switch to Axure and Ctrl+V to verify.`);
}
