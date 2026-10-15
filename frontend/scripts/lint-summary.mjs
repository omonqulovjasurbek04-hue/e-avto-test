// Compact lint listing: "path:line E|w rule message" (handy for fixing in bulk).
import { execFileSync } from "node:child_process";

let out;
try {
  out = execFileSync("npx", ["eslint", "src", "-f", "json"], { encoding: "utf8", shell: true, maxBuffer: 50_000_000 });
} catch (e) {
  out = e.stdout;
}
const results = JSON.parse(out.slice(out.indexOf("[")));
for (const f of results) {
  for (const m of f.messages) {
    const file = f.filePath.split("frontend")[1].replace(/\\/g, "/");
    console.log(`${file}:${m.line} ${m.severity === 2 ? "E" : "w"} ${m.ruleId} ${m.message.slice(0, 80)}`);
  }
}
