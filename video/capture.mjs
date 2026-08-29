/**
 * Captures the demo footage from the live site with a CDP screencast.
 *
 *   node video/capture.mjs before  <outdir>   — scripted browser-automation agent (no WebMCP) on /legacy
 *   node video/capture.mjs after   <outdir>   — tool-driven replay on the agent-native portal
 *   node video/capture.mjs slides  <outdir>   — renders video/slide_*.html to PNG
 *
 * Frames land as JPEGs plus an ffconcat list with real inter-frame durations.
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "https://overturn-one.vercel.app";
const CHROME = process.env.CHROME ?? "/usr/bin/google-chrome";
const [, , mode, outdir] = process.argv;
if (!mode || !outdir) throw new Error("usage: capture.mjs <before|after|slides> <outdir>");
fs.mkdirSync(outdir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const here = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(here, "..");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--enable-features=WebMCP", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

// ---------- overlay: fake cursor + HUD, persisted across navigations ----------
await page.evaluateOnNewDocument(() => {
  const ready = () => {
    if (document.getElementById("__cur")) return;
    const cur = document.createElement("div");
    cur.id = "__cur";
    cur.style.cssText = "position:fixed;left:0;top:0;width:26px;height:36px;z-index:2147483647;pointer-events:none;transform:translate(-4px,-2px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));display:none";
    cur.innerHTML = '<svg viewBox="0 0 26 36" width="26" height="36"><path d="M2 2 L2 28 L9 21 L14 33 L19 31 L14 19 L24 19 Z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(cur);
    const hud = document.createElement("div");
    hud.id = "__hud";
    hud.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483646;pointer-events:none;background:rgba(22,33,31,.92);color:#fff;font:600 14px/1.35 -apple-system,Segoe UI,Roboto,sans-serif;padding:12px 14px;border-radius:10px;min-width:250px;box-shadow:0 6px 20px rgba(0,0,0,.25)";
    document.documentElement.appendChild(hud);
    const render = () => {
      const label = sessionStorage.getItem("hud_label") ?? "";
      const start = Number(sessionStorage.getItem("hud_start") ?? Date.now());
      const steps = Number(sessionStorage.getItem("hud_steps") ?? 0);
      const note = sessionStorage.getItem("hud_note") ?? "";
      const el = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const mm = String(Math.floor(el / 60)), ss = String(el % 60).padStart(2, "0");
      hud.innerHTML = `<div style="opacity:.75;font-size:11px;letter-spacing:.08em;text-transform:uppercase">${label}</div>
        <div style="display:flex;gap:18px;margin-top:4px;font-variant-numeric:tabular-nums"><span>steps <b style="font-size:18px">${steps}</b></span><span>elapsed <b style="font-size:18px">${mm}:${ss}</b></span></div>
        ${note ? `<div style="margin-top:6px;color:#ffb4a8;font-size:13px">${note}</div>` : ""}`;
      hud.style.display = label ? "block" : "none";
    };
    render();
    setInterval(render, 250);
    window.__moveCursor = (x, y, ms = 650) =>
      new Promise((res) => {
        cur.style.display = "block";
        const sx = Number(cur.dataset.x ?? x), sy = Number(cur.dataset.y ?? y);
        const t0 = performance.now();
        const step = (t) => {
          const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
          const cx = sx + (x - sx) * e, cy = sy + (y - sy) * e;
          cur.style.left = cx + "px"; cur.style.top = cy + "px";
          if (k < 1) requestAnimationFrame(step);
          else { cur.dataset.x = x; cur.dataset.y = y; res(); }
        };
        requestAnimationFrame(step);
      });
    window.__click = () => {
      cur.animate([{ transform: "translate(-4px,-2px) scale(1)" }, { transform: "translate(-4px,-2px) scale(.8)" }, { transform: "translate(-4px,-2px) scale(1)" }], { duration: 220 });
    };
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
});

const hud = (label, note = "") => page.evaluate((l, n) => {
  if (!sessionStorage.getItem("hud_start")) sessionStorage.setItem("hud_start", String(Date.now()));
  sessionStorage.setItem("hud_label", l);
  sessionStorage.setItem("hud_note", n);
}, label, note);
const resetHud = () => page.evaluate(() => { sessionStorage.setItem("hud_start", String(Date.now())); sessionStorage.setItem("hud_steps", "0"); sessionStorage.setItem("hud_note", ""); });
const bump = () => page.evaluate(() => sessionStorage.setItem("hud_steps", String(Number(sessionStorage.getItem("hud_steps") ?? 0) + 1)));

async function moveTo(handle, ms = 650) {
  const box = await handle.boundingBox();
  if (!box) return null;
  const x = box.x + Math.min(box.width / 2, 120), y = box.y + box.height / 2;
  await page.evaluate((x, y, ms) => window.__moveCursor(x, y, ms), x, y, ms);
  return { x, y };
}
async function clickOn(selector, { navigate = false, ms = 650 } = {}) {
  const h = await page.waitForSelector(selector, { timeout: 8000 });
  await h.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await sleep(250);
  const pt = await moveTo(h, ms);
  await sleep(180);
  await page.evaluate(() => window.__click());
  await bump();
  if (navigate) {
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), page.mouse.click(pt.x, pt.y)]);
  } else {
    await page.mouse.click(pt.x, pt.y);
  }
  await sleep(300);
}
async function smoothScroll(px, ms = 1800) {
  await page.evaluate((px, ms) => new Promise((res) => {
    const y0 = window.scrollY, t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / ms); window.scrollTo(0, y0 + px * (1 - Math.pow(1 - k, 2))); if (k < 1) requestAnimationFrame(step); else res(); };
    requestAnimationFrame(step);
  }), px, ms);
  await bump();
}

// ---------- screencast ----------
async function record() {
  const client = await page.createCDPSession();
  const frames = [];
  let n = 0;
  client.on("Page.screencastFrame", async ({ data, sessionId, metadata }) => {
    const f = path.join(outdir, `f${String(n++).padStart(5, "0")}.jpg`);
    fs.writeFileSync(f, Buffer.from(data, "base64"));
    frames.push({ f, t: metadata.timestamp });
    try { await client.send("Page.screencastFrameAck", { sessionId }); } catch {}
  });
  await client.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 1280, maxHeight: 800, everyNthFrame: 1 });
  return async () => {
    try { await client.send("Page.stopScreencast"); } catch {}
    await sleep(300);
    const lines = ["ffconcat version 1.0"];
    for (let i = 0; i < frames.length; i++) {
      const d = i + 1 < frames.length ? frames[i + 1].t - frames[i].t : 1.0;
      lines.push(`file '${path.basename(frames[i].f)}'`, `duration ${Math.max(0.02, d).toFixed(3)}`);
    }
    if (frames.length) lines.push(`file '${path.basename(frames[frames.length - 1].f)}'`);
    fs.writeFileSync(path.join(outdir, "list.txt"), lines.join("\n") + "\n");
    return frames.length;
  };
}

try {
  if (mode === "slides") {
    for (const f of fs.readdirSync(here).filter((x) => x.startsWith("slide_") && x.endsWith(".html"))) {
      await page.goto(`file://${path.join(here, f)}`, { waitUntil: "networkidle0" });
      await page.evaluate(() => document.fonts.ready);
      await sleep(400);
      await page.screenshot({ path: path.join(outdir, f.replace(".html", ".png")) });
      console.log("rendered", f);
    }
  }

  if (mode === "before") {
    await page.goto(`${BASE}/legacy`, { waitUntil: "networkidle0" });
    await resetHud();
    await hud("Automation agent · no WebMCP · reading the DOM");
    const stop = await record();
    await page.evaluate(() => window.__moveCursor(640, 420, 10));
    await sleep(1500);
    await clickOn("a::-p-text(View)", { navigate: true });                       // denial page
    await sleep(1600);
    await smoothScroll(140, 900);
    await clickOn("a::-p-text(Determination_Letter)");                            // "opens" the PDF
    await page.goto(`file://${path.join(repoRoot, "scripts", "legacy-letter.html")}`, { waitUntil: "load" });
    await hud("Automation agent · no WebMCP · reading a PDF letter");
    await sleep(1200);
    await smoothScroll(520, 2600);
    await sleep(900);
    await page.goto(`${BASE}/legacy/denials/4471`, { waitUntil: "networkidle0" });
    await hud("Automation agent · no WebMCP · looking for the appeal form");
    await bump();
    await sleep(900);
    await clickOn("a::-p-text(Form LHP-402)");                                     // "opens" the form
    await page.goto(`file://${path.join(repoRoot, "scripts", "legacy-form.html")}`, { waitUntil: "load" });
    await hud("Automation agent · no WebMCP · six-page form, free text");
    await sleep(1000);
    await smoothScroll(700, 2600);
    await sleep(500);
    await smoothScroll(900, 2200);
    await sleep(700);
    await page.goto(`${BASE}/legacy/denials/4471`, { waitUntil: "networkidle0" });
    await hud("Automation agent · no WebMCP · how do I submit?");
    await bump();
    await sleep(900);
    const li = await page.waitForSelector("li::-p-text(fax to)");
    await li.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await sleep(300);
    await moveTo(li, 900);
    await sleep(600);
    await li.evaluate((el) => { el.style.outline = "3px solid #a83a2e"; el.style.background = "#f3dcd8"; el.style.padding = "4px 6px"; });
    await bump();
    await hud("Automation agent · no WebMCP", "STALLED — submission is mail or fax only");
    await sleep(4500);
    console.log("frames", await stop());
  }

  if (mode === "after") {
    const pace = Number(process.env.PACE ?? 2400);
    await page.goto(`${BASE}/denials/4471?pace=${pace}`, { waitUntil: "networkidle0" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle0" });
    await resetHud();
    await hud("Agent with WebMCP site tools · calls logged on the page");
    await sleep(600);
    const stop = await record();
    await page.evaluate(() => window.__moveCursor(640, 380, 10));
    await sleep(1800);
    await clickOn("button::-p-text(Replay)");
    // Let the replay run; pan the page at the moments the narration talks about the draft and the attachments.
    const t0 = Date.now();
    const at = async (sec, fn) => { const wait = t0 + sec * 1000 - Date.now(); if (wait > 0) await sleep(wait); await fn(); };
    await at(pace * 7.2 / 1000, async () => { await smoothScroll(420, 1600); });          // draft sections
    await at(pace * 10.5 / 1000, async () => { await smoothScroll(-420, 1200); });         // back to top: attachments + completeness
    await at(pace * 16.5 / 1000, async () => { await page.evaluate(() => window.__moveCursor(640, 200, 500)); });
    await at(pace * 22 / 1000, async () => {});
    await page.waitForFunction(() => document.body.innerText.includes("Case LHP-A-"), { timeout: pace * 30 }).catch(() => {});
    await hud("Agent with WebMCP site tools", "");
    await sleep(3500);
    await smoothScroll(200, 1200);
    await sleep(2500);
    console.log("frames", await stop());
  }
} finally {
  await browser.close();
}
