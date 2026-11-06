// Capture README screenshots from a running app: `npm run dev` in one terminal, then `npm run screenshots`.
// Uses your installed Chrome via puppeteer-core. Override with CHROME_PATH and BASE_URL.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3300";
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = fileURLToPath(new URL("../docs/screenshots/", import.meta.url));

const shots = [
  ["01-landing", "/"],
  ["02-inbox", "/inbox"],
  ["03-knowledge", "/knowledge"],
  ["04-reports", "/reports"],
  ["05-automations", "/automations"],
  ["06-channels", "/channels"],
  ["07-rule-editor", "/automations/r-refund-tag"],
];

await mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--hide-scrollbars"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 1 });
  for (const [name, path] of shots) {
    await page.goto(BASE + path, { waitUntil: "networkidle0" });
    // Let client-side drafting finish if a draft is still being written.
    await page.waitForFunction(() => !document.body.innerText.includes("Reading the order"), { timeout: 15000 }).catch(() => {});
    await page.screenshot({ path: `${OUT}${name}.png` });
    console.log(`saved docs/screenshots/${name}.png`);
  }
} finally {
  await browser.close();
}
