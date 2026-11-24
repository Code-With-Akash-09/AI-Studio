/**
 * Script-specific GUEST characters on the classic rig.
 *
 * The episode writer (AI) describes a guest with a small spec; this module
 * validates it, maps it onto classic-rig parts (body, hair, headwear, facial
 * hair, outfit colours, prop) and registers it in CHARACTERS under a stable
 * id derived from the spec, so the normal timeline / staging / renderer just
 * work. Anything unknown falls back to a role preset. Designs are generated
 * from generic parts only — never named after or styled on existing IP.
 *
 * Spec (all optional except name):
 * {
 *   "name": "Dr. Kamal", "nameHi": "डॉ. कमल", "role": "archaeologist",
 *   "gender": "male" | "female",
 *   "bodyType": "slim" | "chubby" | "tall" | "elder",
 *   "skin": "light" | "wheat" | "tan" | "brown" | "deep" | "pale" | "#hex",
 *   "hair": { "style": "short" | "long" | "bald" | "bun" | "none", "color": "black" | "#hex" ... },
 *   "headwear": "none" | "pith_helmet" | "hat" | "turban" | "crown" | "cap" | "headscarf",
 *   "outfit": { "type": "coat" | "kurta" | "robe" | "saree", "color": "khaki" | "#hex", "accent": "...", "cape": "#hex"? },
 *   "accessories": ["glasses", "beard", "mustache"],
 *   "prop": "magnifier" | "lantern" | "scroll" | "staff" | "brush" | "jar" | "book" | null,
 *   "voice": { "base": "male" | "female", "pitch": -20..30 (Hz), "rate": -10..25 (%) }
 * }
 */
import { CLASSIC_HEADWEAR, CLASSIC_PROPS } from "./classic/classicRig.js";
import { CHARACTERS } from "./characters.js";
import { hashString } from "./random.js";

export const HOST_IDS = ["raazu", "golu", "nani"];
export const MAX_GUESTS = 2;

const NAMED = {
    black: "#25212B",
    brown: "#6B4226",
    darkbrown: "#3E2A1E",
    grey: "#9A9AA6",
    gray: "#9A9AA6",
    white: "#F4F1EC",
    silver: "#C9CCD6",
    blonde: "#E8C46A",
    red: "#D6312E",
    maroon: "#8E2B3A",
    orange: "#F07C2C",
    saffron: "#FF9933",
    yellow: "#F5C542",
    gold: "#F5C542",
    mustard: "#E0A526",
    green: "#3FAE6A",
    olive: "#7A8B3A",
    teal: "#17A9A1",
    blue: "#3D6FD6",
    navy: "#2C3E78",
    sky: "#6EC6F0",
    purple: "#8A55C9",
    violet: "#8A55C9",
    pink: "#F07AA8",
    khaki: "#C8B07A",
    beige: "#E3D3B0",
    cream: "#FFF1D6",
    tan: "#C98A4E",
};
const SKIN = {
    light: "#F6CBA4",
    wheat: "#EDB688",
    tan: "#D9A070",
    brown: "#B97A4C",
    deep: "#8E5A36",
    pale: "#E6EEF3", // ghosts / spirits
};
const BODY = {
    slim: { headR: 124, bodyW: 150, bodyH: 124, legH: 58 },
    chubby: { headR: 134, bodyW: 176, bodyH: 120, legH: 46 },
    tall: { headR: 120, bodyW: 152, bodyH: 146, legH: 66 },
    elder: { headR: 118, bodyW: 164, bodyH: 140, legH: 34 },
};

/** Role presets: used when the AI's spec is missing pieces. */
export const GUEST_PRESETS = {
    archaeologist: {
        bodyType: "slim",
        skin: "tan",
        hair: { style: "short", color: "darkbrown" },
        headwear: "pith_helmet",
        outfit: { type: "coat", color: "khaki", accent: "olive" },
        accessories: ["mustache"],
        prop: "brush",
        voice: { base: "male", pitch: -8, rate: 6 },
    },
    scientist: {
        bodyType: "slim",
        skin: "wheat",
        hair: { style: "bald", color: "grey" },
        outfit: { type: "coat", color: "white", accent: "sky" },
        accessories: ["glasses"],
        prop: "book",
        voice: { base: "male", pitch: -2, rate: 8 },
    },
    king: {
        bodyType: "chubby",
        skin: "wheat",
        hair: { style: "short", color: "black" },
        headwear: "crown",
        outfit: { type: "robe", color: "maroon", accent: "gold", cape: "navy" },
        accessories: ["mustache", "beard"],
        prop: "staff",
        voice: { base: "male", pitch: -14, rate: 0 },
    },
    queen: {
        gender: "female",
        bodyType: "slim",
        skin: "wheat",
        hair: { style: "long", color: "black" },
        headwear: "crown",
        outfit: { type: "saree", color: "purple", accent: "gold" },
        voice: { base: "female", pitch: 2, rate: 4 },
    },
    ghost: {
        bodyType: "tall",
        skin: "pale",
        hair: { style: "long", color: "white" },
        outfit: { type: "robe", color: "white", accent: "sky" },
        prop: "lantern",
        voice: { base: "male", pitch: -18, rate: -6 },
    },
    sage: {
        bodyType: "elder",
        skin: "tan",
        hair: { style: "bald", color: "white" },
        headwear: "none",
        outfit: { type: "robe", color: "saffron", accent: "maroon" },
        accessories: ["beard", "mustache"],
        prop: "staff",
        voice: { base: "male", pitch: -10, rate: -4 },
    },
    villager: {
        bodyType: "chubby",
        skin: "brown",
        hair: { style: "short", color: "black" },
        headwear: "turban",
        outfit: { type: "kurta", color: "cream", accent: "red" },
        accessories: ["mustache"],
        prop: "lantern",
        voice: { base: "male", pitch: -4, rate: 10 },
    },
    teacher: {
        gender: "female",
        bodyType: "slim",
        skin: "wheat",
        hair: { style: "bun", color: "black" },
        outfit: { type: "saree", color: "teal", accent: "yellow" },
        accessories: ["glasses"],
        prop: "book",
        voice: { base: "female", pitch: 0, rate: 8 },
    },
    explorer: {
        bodyType: "tall",
        skin: "light",
        hair: { style: "short", color: "brown" },
        headwear: "hat",
        outfit: { type: "coat", color: "olive", accent: "khaki" },
        prop: "lantern",
        voice: { base: "male", pitch: -6, rate: 8 },
    },
};

const ROLE_ALIASES = [
    [/archa?eolog|excavat|digger|पुरातत्व/i, "archaeologist"],
    [/scien|doctor|professor|researcher|वैज्ञानिक/i, "scientist"],
    [/king|pharaoh|raja|emperor|sultan|राजा|फ़िरौन|फिरौन/i, "king"],
    [/queen|rani|empress|रानी/i, "queen"],
    [/ghost|spirit|bhoot|phantom|भूत|आत्मा/i, "ghost"],
    [/sage|monk|saint|rishi|baba|sadhu|ऋषि|बाबा/i, "sage"],
    [/villag|farmer|kisan|shepherd|गाँव|किसान/i, "villager"],
    [/teacher|guide|madam|मैडम|शिक्षक/i, "teacher"],
    [/explor|traveller|traveler|sailor|captain|pilot/i, "explorer"],
];

export function presetForRole(role) {
    const r = String(role || "");
    for (const [re, id] of ROLE_ALIASES) if (re.test(r)) return id;
    return "explorer";
}

function color(value, fallback) {
    const v = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");
    if (/^#[0-9a-f]{6}$/.test(v)) return v.toUpperCase();
    return NAMED[v] || fallback;
}

/** Darken a #RRGGBB colour (for outfitDark / hat band). */
export function shade(hex, k = 0.22) {
    const v = Number.parseInt(hex.slice(1), 16);
    const c = [16, 8, 0].map((s) =>
        Math.round(((v >> s) & 255) * (1 - k))
            .toString(16)
            .padStart(2, "0"),
    );
    return `#${c.join("")}`.toUpperCase();
}

const pick = (v, list, fallback) => (list.includes(v) ? v : fallback);
const clampNum = (v, lo, hi, d) => {
    const x = Number.parseFloat(v);
    return Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : d;
};
const signed = (v, unit) => `${v >= 0 ? "+" : ""}${v}${unit}`;

/**
 * Validate an AI guest spec against presets. Returns { spec, warnings }.
 * Pure + deterministic (same input → same output).
 */
export function normalizeGuestSpec(raw, index = 0) {
    const warnings = [];
    const src = raw && typeof raw === "object" ? raw : {};
    const presetId = GUEST_PRESETS[src.preset]
        ? src.preset
        : presetForRole(`${src.role || ""} ${src.name || ""}`);
    const P = GUEST_PRESETS[presetId];
    const name =
        String(src.name || "")
            .replace(/[^\p{L}\p{N} .'-]/gu, "")
            .trim()
            .slice(0, 24) || `Guest ${index + 1}`;
    const nameHi =
        String(src.nameHi || "")
            .replace(/[^\p{L}\p{M}\p{N} .-]/gu, "")
            .trim()
            .slice(0, 24) || name;
    const gender = src.gender === "female" ? "female" : P.gender || "male";
    let outfitType = pick(
        src.outfit?.type,
        ["coat", "kurta", "robe", "saree"],
        P.outfit.type,
    );
    if (outfitType === "saree" && gender !== "female") {
        warnings.push("saree needs a female guest; using robe");
        outfitType = "robe";
    }
    const hairStyle = pick(
        src.hair?.style,
        ["short", "long", "bald", "bun", "none"],
        P.hair.style,
    );
    const headwear = pick(src.headwear, CLASSIC_HEADWEAR, P.headwear || "none");
    const accessories = (
        Array.isArray(src.accessories) ? src.accessories : P.accessories || []
    )
        .map((a) => String(a).toLowerCase().trim())
        .filter((a) => ["glasses", "beard", "mustache"].includes(a));
    const prop =
        src.prop === null || src.prop === "none"
            ? null
            : pick(src.prop, CLASSIC_PROPS, P.prop || null);
    const vb = ["male", "female"].includes(src.voice?.base)
        ? src.voice.base
        : gender;
    const spec = {
        name,
        nameHi,
        role: String(src.role || presetId).slice(0, 40),
        preset: presetId,
        gender,
        bodyType: pick(src.bodyType, Object.keys(BODY), P.bodyType),
        skin:
            SKIN[String(src.skin || "").toLowerCase()] ||
            (/^#[0-9a-f]{6}$/i.test(String(src.skin || ""))
                ? String(src.skin).toUpperCase()
                : SKIN[P.skin]),
        hair: {
            style: hairStyle,
            color: color(src.hair?.color, color(P.hair.color, "#25212B")),
        },
        headwear,
        outfit: {
            type: outfitType,
            color: color(src.outfit?.color, color(P.outfit.color, "#3D6FD6")),
            accent: color(
                src.outfit?.accent,
                color(P.outfit.accent, "#F5C542"),
            ),
            cape:
                src.outfit && "cape" in src.outfit
                    ? src.outfit.cape
                        ? color(src.outfit.cape, null)
                        : null
                    : P.outfit.cape
                      ? color(P.outfit.cape, null)
                      : null,
        },
        accessories: [...new Set(accessories)],
        prop,
        voice: {
            base: vb,
            pitch: clampNum(src.voice?.pitch, -20, 30, P.voice.pitch),
            rate: clampNum(src.voice?.rate, -10, 25, P.voice.rate),
        },
    };
    // keep guests audibly different from the hosts on the same 2 voices:
    // Raazu/Golu are Madhur -4Hz / +28Hz, Nani is Swara -18Hz
    const p = spec.voice.pitch;
    spec.voice.pitch =
        spec.voice.base === "male"
            ? p >= 2
                ? Math.min(18, Math.max(10, p))
                : Math.max(-20, Math.min(-12, p))
            : Math.max(-6, Math.min(24, p));
    if (gender === "female")
        spec.accessories = spec.accessories.filter(
            (a) => a !== "beard" && a !== "mustache",
        );
    return { spec, warnings };
}

/** Stable id for a normalized spec (so resumed jobs get the same guest). */
export function guestId(spec) {
    return `guest-${hashString(JSON.stringify(spec)).toString(16).slice(0, 8)}`;
}

const VOICES = { male: "hi-IN-MadhurNeural", female: "hi-IN-SwaraNeural" };
const CAPTION_COLORS = ["#7FD3FF", "#C9A2FF", "#9BE58A", "#FFB3C7"];

/** Map a normalized spec onto a full CHARACTERS-style entry (classic rig). */
export function buildGuestCharacter(spec, index = 0) {
    const id = guestId(spec);
    const B = BODY[spec.bodyType];
    const body =
        spec.outfit.type === "saree"
            ? "saree"
            : spec.outfit.type === "coat"
              ? "coat"
              : spec.outfit.type === "kurta" && spec.bodyType === "chubby"
                ? "round"
                : "robe";
    const outfit = spec.outfit.color;
    const classic = {
        headR: B.headR,
        bodyW: B.bodyW,
        bodyH: body === "saree" ? Math.max(B.bodyH, 146) : B.bodyH,
        legH:
            body === "saree"
                ? 26
                : body === "robe"
                  ? Math.min(B.legH, 40)
                  : B.legH,
        body,
        hair:
            spec.hair.style === "short"
                ? "short"
                : spec.hair.style === "none"
                  ? "none"
                  : spec.hair.style,
        hairColor: spec.hair.color,
        iris: spec.skin === SKIN.pale ? "#5A7FA8" : "#6B4226",
        skin: spec.skin,
        outfit,
        outfitDark: shade(outfit),
        shirt:
            spec.outfit.type === "coat"
                ? "#FFF4E2"
                : shade(spec.outfit.accent, -0.1),
        accent: spec.outfit.accent,
        pants:
            body === "robe" || body === "saree"
                ? shade(outfit, 0.35)
                : "#4A4E69",
        shoes: "#6B4430",
        eyes:
            spec.gender === "female"
                ? "oval"
                : spec.bodyType === "chubby"
                  ? "round"
                  : "oval",
        nose: spec.bodyType === "chubby" ? "button" : "curve",
        glasses: spec.accessories.includes("glasses") ? "small" : null,
        glassesColor: "#4A2F1F",
        prop: spec.prop,
        headwear: spec.headwear === "none" ? null : spec.headwear,
        hatColor:
            spec.headwear === "crown"
                ? "#F5C542"
                : spec.headwear === "pith_helmet"
                  ? "#E9DDB8"
                  : spec.outfit.accent,
        hatDark: shade(spec.outfit.accent, 0.35),
        beard: spec.accessories.includes("beard"),
        mustache: spec.accessories.includes("mustache"),
        beardColor: spec.hair.color,
        cape: spec.outfit.cape || null,
    };
    const voiceName = VOICES[spec.voice.base];
    return {
        id,
        name: spec.name,
        nameHi: spec.nameHi,
        role: "guest",
        archetype: spec.role,
        guestSpec: spec,
        oneLiner: `${spec.name}, ${spec.role} (script guest)`,
        voice: {
            engine: "edge-tts",
            name: voiceName,
            rate: signed(spec.voice.rate, "%"),
            pitch: signed(spec.voice.pitch, "Hz"),
        },
        palette: {
            skin: spec.skin,
            hair: spec.hair.color,
            outfit,
            accent: spec.outfit.accent,
            outline: "#1A1A22",
            caption: CAPTION_COLORS[index % CAPTION_COLORS.length],
        },
        classic,
    };
}

/**
 * Register guests (raw AI specs or normalized specs) in CHARACTERS.
 * @returns {{ ids: string[], characters: object[], warnings: string[] }}
 */
export function registerGuests(list = []) {
    const out = { ids: [], characters: [], warnings: [] };
    (Array.isArray(list) ? list : []).slice(0, MAX_GUESTS).forEach((raw, i) => {
        const { spec, warnings } = normalizeGuestSpec(raw, i);
        const ch = buildGuestCharacter(spec, i);
        CHARACTERS[ch.id] = ch;
        // a spec saved by an older build may normalize differently: keep the
        // id its dialogue was written with working too
        if (raw && typeof raw === "object" && raw.preset) {
            const savedId = guestId(raw);
            if (savedId !== ch.id && !CHARACTERS[savedId])
                CHARACTERS[savedId] = { ...ch, id: savedId };
        }
        out.ids.push(ch.id);
        out.characters.push(ch);
        out.warnings.push(...warnings.map((w) => `${spec.name}: ${w}`));
    });
    return out;
}
