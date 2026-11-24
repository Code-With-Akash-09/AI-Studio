/**
 * Contact sheet of the script-driven settings (backgrounds), hosts for scale.
 *   node .scripts/animation/render-settings.mjs [out.png] [vertical] [preset,preset…]
 */
import fs from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { getStageLayout } from "../../src/lib/services/animation/backgrounds.js";
import { CHARACTERS } from "../../src/lib/services/animation/characters.js";
import { renderClassicCharacter } from "../../src/lib/services/animation/classic/classicRig.js";
import {
    normalizeSetting,
    renderSettingLayers,
    SETTING_PRESETS,
} from "../../src/lib/services/animation/classic/settings.js";

const out = process.argv[2] || "/workspace/anim-demo/qa/settings-sheet.png";
const vertical = process.argv[3] === "vertical";
const list = process.argv[4]
    ? process.argv[4].split(",")
    : Object.keys(SETTING_PRESETS);
const [W, H] = vertical ? [1080, 1920] : [1920, 1080];
const cols = vertical ? 4 : 4;
const tw = vertical ? 360 : 640;
const th = vertical ? 640 : 360;
const rows = Math.ceil(list.length / cols);
const L = getStageLayout(W, H);
let sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * tw}" height="${rows * th}">`;
list.forEach((p, i) => {
    const spec = normalizeSetting(p);
    const lay = renderSettingLayers(spec, L, { t: 1.2 });
    let svg = `<svg x="${(i % cols) * tw}" y="${Math.floor(i / cols) * th}" width="${tw}" height="${th}" viewBox="0 0 ${W} ${H}"><defs><clipPath id="cl${i}"><rect width="${W}" height="${H}"/></clipPath></defs><g clip-path="url(#cl${i})">`;
    for (const l of lay.back) svg += l.svg;
    const sc = L.characterScale * 1.18;
    svg += renderClassicCharacter(CHARACTERS.raazu, {
        x: L.slots[0],
        y: L.groundY,
        scale: sc,
        t: 1,
        uid: `r${i}`,
        rim: lay.rim,
        expression: "happy",
        pose: "explain",
    });
    svg += renderClassicCharacter(CHARACTERS.golu, {
        x: L.slots[1],
        y: L.groundY,
        scale: sc,
        t: 1,
        uid: `g${i}`,
        rim: lay.rim,
        facing: -1,
        expression: "shocked",
        pose: "scared",
        since: 2,
    });
    for (const l of lay.front) svg += l.svg;
    svg += `<rect x="0" y="0" width="${W}" height="${vertical ? 110 : 80}" fill="#000" opacity="0.55"/><text x="24" y="${vertical ? 76 : 58}" font-family="DejaVu Sans" font-size="${vertical ? 60 : 50}" font-weight="700" fill="#fff">${p}</text></g></svg>`;
    sheet += svg;
});
sheet += "</svg>";
fs.writeFileSync(
    out,
    new Resvg(sheet, { font: { loadSystemFonts: true } }).render().asPng(),
);
console.log(out, list.length);
