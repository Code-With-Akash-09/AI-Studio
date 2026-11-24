/**
 * Reference sheet for generated guest characters (classic rig).
 *
 *   node .scripts/animation/render-guests.mjs [out.png] [specs.json]
 *
 * Without specs.json it draws every role preset; with it, the AI's guest
 * specs (array) — e.g. the `guests` of an episode. Hosts are drawn for scale.
 */
import fs from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { CHARACTERS } from "../../src/lib/services/animation/characters.js";
import { renderClassicCharacter } from "../../src/lib/services/animation/classic/classicRig.js";
import {
    GUEST_PRESETS,
    registerGuests,
} from "../../src/lib/services/animation/guests.js";

const out = process.argv[2] || "/workspace/anim-demo/qa/guest-presets.png";
const specsFile = process.argv[3];
const specs = specsFile
    ? JSON.parse(fs.readFileSync(specsFile, "utf8"))
    : Object.keys(GUEST_PRESETS).map((preset) => ({
          name: preset[0].toUpperCase() + preset.slice(1),
          role: preset,
          preset,
      }));
const guests = [];
for (let i = 0; i < specs.length; i += 2)
    guests.push(...registerGuests(specs.slice(i, i + 2)).characters);
const cast = [CHARACTERS.raazu, CHARACTERS.golu, ...guests];
const cellW = 520;
const cellH = 880;
const W = cellW * Math.min(cast.length, 6);
const rows = Math.ceil(cast.length / 6);
const H = cellH * rows;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#F3EEE4"/>`;
cast.forEach((ch, i) => {
    const cx = (i % 6) * cellW + cellW / 2;
    const top = Math.floor(i / 6) * cellH;
    const gy = top + cellH - 150;
    svg += `<rect x="${cx - cellW / 2 + 8}" y="${top + 8}" width="${cellW - 16}" height="${cellH - 16}" rx="24" fill="#FFFFFF" stroke="#D8D0C2" stroke-width="3"/>`;
    svg += renderClassicCharacter(ch, {
        x: cx - 40,
        y: gy,
        scale: 1.25,
        pose: i % 2 ? "point" : "idle",
        gesture: null,
        expression: i % 3 === 0 ? "happy" : i % 3 === 1 ? "curious" : "neutral",
        t: 0.4 + i,
        uid: `g${i}`,
    });
    const label = `${ch.name}${ch.role === "guest" ? ` — ${ch.archetype}` : " (host)"}`;
    svg += `<text x="${cx}" y="${top + cellH - 70}" font-family="DejaVu Sans" font-size="30" font-weight="bold" text-anchor="middle" fill="#2A2233">${label.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`;
    if (ch.voice)
        svg += `<text x="${cx}" y="${top + cellH - 32}" font-family="DejaVu Sans" font-size="22" text-anchor="middle" fill="#6A6070">${ch.voice.name.replace("hi-IN-", "").replace("Neural", "")} ${ch.voice.rate} ${ch.voice.pitch}</text>`;
});
svg += "</svg>";
const png = new Resvg(svg, {
    font: { loadSystemFonts: true },
})
    .render()
    .asPng();
fs.mkdirSync(out.replace(/\/[^/]+$/, ""), { recursive: true });
fs.writeFileSync(out, png);
console.log(`guest sheet → ${out} (${cast.length - 2} guests)`);
