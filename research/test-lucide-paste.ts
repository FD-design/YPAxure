// Paste a Lucide "search" icon into Axure (image mode = SVG rendered to PNG bitmap).
import { pasteLucideIcon } from "../dist/parser/index.js";

const result = await pasteLucideIcon("search", {
  size: 96,
  color: "#3B82F6", // blue
  strokeWidth: 2,
  autoPaste: true,
});
console.log(JSON.stringify(result, null, 2));
