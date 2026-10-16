// Fills MISSING keys of uz_cyrl.json from uz.json by transliterating Uzbek Latin -> Cyrillic.
// Existing Cyrillic texts are never overwritten (a native speaker may have corrected them).
// Usage: node scripts/i18n-cyrl.mjs [--check | --all]
//   --check: only list missing keys, exit 1 if any;  --all: regenerate every key (overwrites manual fixes!)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/locales");
const ALL = process.argv.includes("--all");
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));

const PAIRS = [
  ["yo'", "йў"], ["o'", "ў"], ["g'", "ғ"], ["sh", "ш"], ["ch", "ч"], ["yo", "ё"], ["yu", "ю"], ["ya", "я"], ["ye", "е"], ["ts", "ц"],
];
const SINGLE = {
  a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п",
  q: "қ", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "х", y: "й", z: "з", "'": "ъ",
};
const upper = (s) => s.toLocaleUpperCase("uz");

// Loanwords whose Cyrillic spelling is not a letter-by-letter copy of the Latin one.
const WORDS = {
  email: "электрон почта", parol: "пароль", rol: "роль", parolni: "паролни", parolingiz: "паролингиз", parolingizni: "паролингизни", panel: "панель", paneli: "панели",
  "e-avto": "E-Avto", telegram: "Telegram", faq: "FAQ", seo: "SEO", superadmin: "суперадмин", dashboard: "дашборд",
  mock: "mock", rate: "rate", limit: "limit", redis: "Redis", node: "Node", production: "production",
};

function word(w) {
  const known = WORDS[w.toLowerCase()];
  if (known) return w[0] !== w[0].toLowerCase() && known[0] === known[0].toLowerCase() ? upper(known[0]) + known.slice(1) : known;
  // Abbreviations, codes, env names, e-mails, paths: keep as written.
  if (/[0-9_@/\\.]/.test(w) || (w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w))) return w;
  const norm = w.replace(/[ʻ‘’`ʼ]/g, "'");
  let out = "";
  for (let i = 0; i < norm.length; ) {
    const rest = norm.slice(i).toLowerCase();
    const pair = PAIRS.find(([lat]) => rest.startsWith(lat));
    const len = pair ? pair[0].length : 1;
    const src = norm.slice(i, i + len);
    let cyr;
    if (pair) cyr = pair[1];
    else if (rest[0] === "e" && (i === 0 || norm[i - 1] === "'")) cyr = "э";
    else cyr = SINGLE[rest[0]] ?? src;
    out += src[0] !== src[0].toLowerCase() ? upper(cyr[0]) + cyr.slice(1) : cyr;
    i += len;
  }
  return out;
}

/** Transliterates prose but leaves {{placeholders}}, <tags> and `code` untouched. */
export function toCyrl(text) {
  return text
    .split(/({{[^}]*}}|<[^>]*>|`[^`]*`)/)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(/[A-Za-z0-9_@/\\ʻ‘’`ʼ'-]+(?:\.[A-Za-z0-9_]+)*/g, (tok) => (WORDS[tok.toLowerCase()] ? word(tok) : tok.split("-").map(word).join("-")))))
    .join("")
    // A tutuq belgisi at the very end of a word/quote is a quote mark, not "ъ".
    .replace(/ъ(?=[\s,.!?:;)]|$)/g, "'");
}

function fill(src, dst, prefix, missing) {
  for (const [k, v] of Object.entries(src)) {
    const key = `${prefix}${k}`;
    if (v && typeof v === "object") {
      if (!dst[k] || typeof dst[k] !== "object") dst[k] = {};
      fill(v, dst[k], `${key}.`, missing);
    } else if (dst[k] === undefined || ALL) {
      missing.push(key);
      dst[k] = toCyrl(String(v));
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const uz = read("uz.json");
  const cyrl = read("uz_cyrl.json");
  const missing = [];
  fill(uz, cyrl, "", missing);
  if (process.argv.includes("--check")) {
    console.log(missing.length ? `missing in uz_cyrl: ${missing.join(", ")}` : "uz_cyrl: nothing missing");
    process.exit(missing.length ? 1 : 0);
  }
  fs.writeFileSync(path.join(dir, "uz_cyrl.json"), JSON.stringify(cyrl, null, 2) + "\n");
  console.log(`uz_cyrl: ${missing.length} keys transliterated`);
}
