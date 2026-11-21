/**
 * Render a reference sheet PNG per character from the 2D rig:
 * front view + expression variants + palette + catchphrases + voice.
 *
 * Usage: node .scripts/animation/render-refs.mjs [outDir] [ids...]
 * Default outDir /workspace/anim-demo/refs, default ids = lead characters.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import {
    CHARACTERS,
    LEAD_CHARACTER_IDS,
} from "../../src/lib/services/animation/characters.js";
import { FONTS_DIR } from "../../src/lib/services/animation/renderer.js";
import { getFFmpegPath } from "../../src/lib/utils/ffmpeg.js";
import {
    characterHeight,
    renderCharacter,
} from "../../src/lib/services/animation/rig.js";

const outDir = path.resolve(process.argv[2] || "/workspace/anim-demo/refs");
const ids = process.argv.slice(3).length
    ? process.argv.slice(3)
    : LEAD_CHARACTER_IDS;

const W = 2400;
const H = 1600;
const VARIANTS = [
    ["neutral", "idle", "Neutral"],
    ["curious", "think", "Curious / Thinking"],
    ["shocked", "idle", "Shocked"],
    ["scared", "scared", "Scared"],
    ["laughing", "laugh", "Laughing"],
    ["suspicious", "hips", "Angry / Suspicious"],
];

// resvg cannot shape Devanagari reliably, so Devanagari strings are queued
// here and burned in afterwards with libass (HarfBuzz) via ffmpeg.
let devanagari = [];
const DEVANAGARI = /[\u0900-\u097F]/;

const esc = (s) =>
    String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

function text(
    x,
    y,
    str,
    {
        size = 32,
        color = "#1A1A22",
        family = "Mukta",
        anchor = "start",
        weight = 700,
    } = {},
) {
    if (DEVANAGARI.test(str)) {
        devanagari.push({ x, y, str, size, color, anchor });
        return "";
    }
    return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(str)}</text>`;
}

function assColor(hex) {
    const h = hex.replace("#", "");
    return `&H00${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase();
}

function devanagariAss() {
    const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: T,Mukta,32,&H00000000,&H000000FF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,0,1,0,0,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;
    const events = devanagari.map(({ x, y, str, size, color, anchor }) => {
        const an = anchor === "middle" ? 2 : anchor === "end" ? 3 : 1;
        // SVG y is the baseline; libass bottom alignment sits ~0.28em lower.
        const py = Math.round(y + size * 0.36);
        return `Dialogue: 0,0:00:00.00,0:00:05.00,T,,0,0,0,,{\\an${an}\\pos(${x},${py})\\fs${Math.round(size * 1.5)}\\c${assColor(color)}}${str}`;
    });
    return `${header}\n${events.join("\n")}\n`;
}

function sheet(character) {
    const ch = character;
    const hgt = characterHeight(ch);
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    svg += `<rect width="${W}" height="${H}" fill="#F6F2EA"/>`;
    svg += `<rect x="0" y="0" width="${W}" height="120" fill="${ch.palette.outfit}"/>`;
    svg += text(48, 80, `${ch.name.toUpperCase()}  (${ch.nameHi})`, {
        size: 58,
        color: "#FFFFFF",
    });
    svg += text(
        W - 48,
        56,
        "Raaz Explain Tv · original character · 2D rig v1",
        { size: 28, color: "#FFFFFF", anchor: "end", family: "Poppins" },
    );
    svg += text(W - 48, 96, ch.archetype, {
        size: 30,
        color: "#FFFFFF",
        anchor: "end",
        family: "Poppins",
    });

    // Front view panel
    svg += `<rect x="40" y="150" width="780" height="940" rx="24" fill="#FFFFFF" stroke="#D8D0C2" stroke-width="3"/>`;
    const frontScale = Math.min(1.3, 780 / hgt);
    svg += `<ellipse cx="430" cy="1040" rx="260" ry="26" fill="#E9E2D6"/>`;
    svg += renderCharacter(ch, {
        x: 430,
        y: 1040,
        scale: frontScale,
        expression: "neutral",
        pose: "idle",
        look: [0, 0],
    });
    svg += text(70, 200, "Front view", { size: 34, family: "Poppins" });

    // Expression grid (3 x 2), bust crops
    VARIANTS.forEach(([expression, pose, label], i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cx = 860 + col * 510;
        const cy = 150 + row * 475;
        const cw = 490;
        const chh = 455;
        const clip = `clip${i}`;
        svg += `<defs><clipPath id="${clip}"><rect x="${cx}" y="${cy}" width="${cw}" height="${chh}" rx="24"/></clipPath></defs>`;
        svg += `<rect x="${cx}" y="${cy}" width="${cw}" height="${chh}" rx="24" fill="#FFFFFF" stroke="#D8D0C2" stroke-width="3"/>`;
        const s = 0.9;
        const feet = cy + 70 + hgt * s;
        svg += `<g clip-path="url(#${clip})">${renderCharacter(ch, { x: cx + cw / 2, y: feet, scale: s, expression, pose, look: expression === "suspicious" ? [1, 0.1] : undefined })}</g>`;
        svg += `<rect x="${cx}" y="${cy + chh - 62}" width="${cw}" height="62" fill="${ch.palette.outfit}" fill-opacity="0.92" clip-path="url(#${clip})"/>`;
        svg += text(cx + cw / 2, cy + chh - 20, label, {
            size: 32,
            color: "#FFFFFF",
            anchor: "middle",
            family: "Poppins",
        });
    });

    // Bottom band: palette, catchphrases, voice
    const by = 1120;
    svg += `<rect x="40" y="${by}" width="${W - 80}" height="440" rx="24" fill="#FFFFFF" stroke="#D8D0C2" stroke-width="3"/>`;
    svg += text(70, by + 56, "Palette", { size: 34, family: "Poppins" });
    const swatches = [
        "skin",
        "hair",
        "outfit",
        "accent",
        "pants",
        "shoes",
        "outline",
    ];
    swatches.forEach((key, i) => {
        const x = 70 + (i % 4) * 150;
        const y = by + 80 + Math.floor(i / 4) * 160;
        svg += `<rect x="${x}" y="${y}" width="120" height="90" rx="14" fill="${ch.palette[key]}" stroke="#1A1A22" stroke-width="4"/>`;
        svg += text(x + 60, y + 118, key, {
            size: 22,
            anchor: "middle",
            family: "Poppins",
            weight: 400,
        });
        svg += text(x + 60, y + 144, ch.palette[key], {
            size: 20,
            anchor: "middle",
            family: "Poppins",
            weight: 400,
            color: "#555",
        });
    });

    const tx = 700;
    svg += text(tx, by + 56, "Catchphrases", { size: 34, family: "Poppins" });
    ch.catchphrases.slice(0, 3).forEach((c, i) => {
        svg += text(tx, by + 108 + i * 84, `“${c.hi}”`, { size: 34 });
        svg += text(tx, by + 142 + i * 84, c.roman, {
            size: 24,
            family: "Poppins",
            weight: 400,
            color: "#555",
        });
    });
    const vx = 1720;
    svg += text(vx, by + 56, "Voice (Edge TTS)", {
        size: 34,
        family: "Poppins",
    });
    svg += text(vx, by + 104, ch.voice.name, { size: 30, family: "Poppins" });
    svg += text(
        vx,
        by + 144,
        `rate ${ch.voice.rate} · pitch ${ch.voice.pitch}`,
        { size: 28, family: "Poppins", weight: 400 },
    );
    const words = ch.visualSpec.split(" ");
    let line = "";
    let ly = by + 210;
    svg += text(vx, by + 196 - 10, "Look", { size: 26, family: "Poppins" });
    for (const w of words) {
        if ((line + w).length > 38) {
            svg += text(vx, ly + 20, line.trim(), {
                size: 22,
                family: "Poppins",
                weight: 400,
                color: "#444",
            });
            ly += 30;
            line = "";
        }
        line += `${w} `;
    }
    if (line.trim())
        svg += text(vx, ly + 20, line.trim(), {
            size: 22,
            family: "Poppins",
            weight: 400,
            color: "#444",
        });

    svg += "</svg>";
    return svg;
}

fs.mkdirSync(outDir, { recursive: true });
for (const id of ids) {
    const ch = CHARACTERS[id];
    if (!ch) throw new Error(`Unknown character ${id}`);
    devanagari = [];
    const png = new Resvg(sheet(ch), {
        font: {
            loadSystemFonts: false,
            fontFiles: [
                path.join(FONTS_DIR, "Mukta-Bold.ttf"),
                path.join(FONTS_DIR, "Poppins-Bold.ttf"),
            ],
            defaultFontFamily: "Mukta",
        },
    })
        .render()
        .asPng();
    const out = path.join(outDir, `${id}-reference-sheet.png`);
    const base = path.join(outDir, `.${id}-base.png`);
    const assPath = path.join(outDir, `.${id}.ass`);
    fs.writeFileSync(base, png);
    fs.writeFileSync(assPath, devanagariAss(), "utf8");
    const res = spawnSync(getFFmpegPath(), [
        "-y",
        "-v",
        "error",
        "-i",
        base,
        "-vf",
        `ass=filename='${assPath}':fontsdir='${FONTS_DIR}'`,
        "-frames:v",
        "1",
        out,
    ]);
    if (res.status !== 0) throw new Error(res.stderr.toString());
    fs.rmSync(base);
    fs.rmSync(assPath);
    console.log(out);
}
