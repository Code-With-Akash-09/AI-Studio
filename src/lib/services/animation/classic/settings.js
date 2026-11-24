/**
 * Script-driven SETTINGS (backgrounds) for the classic style.
 *
 * The episode writer picks a setting per part — a preset name or a small spec
 * (location, era, time of day, weather / sky event, key props, palette). This
 * module validates it (unknown values fall back), gives it a stable id
 * ("set-<hash>") and draws it from layered, parametric SVG parts:
 *
 *   sky (gradient, sun / moon / stars, clouds, sky event)  f 0.03-0.12
 *   far (mountains, dunes, skyline, tree line, pyramids…)   f 0.25
 *   mid (forest rows, fort, huts, interior back wall…)      f 0.55
 *   ground + props (behind the characters' feet)            f 1
 *   weather particles (snow / rain / embers, translucent)   f 1.15
 *
 * Every number comes from the spec + a seed, so two parts of one episode (or
 * two different scripts) never share the exact same picture, and a resumed
 * render draws the same picture again. Everything is original, generic
 * scenery drawn in code.
 */
import { createRandom, hashString } from "../random.js";

const n = (v) => Math.round(v * 10) / 10;
const LINE = "#3B3050";
const ln = (w = 4) =>
    `stroke="${LINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

export const LOCATIONS = [
    "taiga",
    "blast_zone",
    "desert",
    "pyramids",
    "tomb",
    "fort",
    "palace",
    "village",
    "city",
    "gali",
    "jungle",
    "beach",
    "mountain",
    "cave",
    "temple",
    "lab",
    "classroom",
    "museum",
    "space",
    "moon",
];
const INTERIORS = new Set([
    "tomb",
    "palace",
    "cave",
    "lab",
    "classroom",
    "museum",
]);
export const TIMES = ["dawn", "day", "sunset", "dusk", "night"];
export const WEATHERS = [
    "clear",
    "cloudy",
    "fog",
    "rain",
    "snow",
    "storm",
    "fireball",
    "smoke",
    "aurora",
];
export const SETTING_PROPS = [
    "fallen_trees",
    "stumps",
    "pines",
    "rocks",
    "torches",
    "lanterns",
    "cactus",
    "palms",
    "crates",
    "barrels",
    "sarcophagus",
    "statue",
    "pots",
    "lab_bench",
    "telescope",
    "globe",
    "bookshelf",
    "blackboard",
    "crater",
    "flag",
    "campfire",
    "boat",
    "well",
    "cart",
];

/** Presets the AI (or the topic keywords) can name directly. */
export const SETTING_PRESETS = {
    siberian_forest: {
        location: "taiga",
        era: "1908",
        time: "dusk",
        weather: "fireball",
        props: ["fallen_trees", "stumps"],
        rim: "#FFB15C",
    },
    siberian_blast: {
        location: "blast_zone",
        era: "1908",
        time: "sunset",
        weather: "smoke",
        props: ["fallen_trees", "stumps", "rocks"],
        rim: "#FF9A52",
    },
    snowy_taiga: {
        location: "taiga",
        time: "day",
        weather: "snow",
        props: ["pines", "rocks"],
    },
    egypt_desert: {
        location: "pyramids",
        era: "ancient",
        time: "day",
        weather: "clear",
        props: ["palms", "rocks"],
    },
    egypt_tomb: {
        location: "tomb",
        era: "ancient",
        time: "night",
        weather: "clear",
        props: ["torches", "sarcophagus", "pots"],
        rim: "#FFB36B",
    },
    rajasthan_fort_night: {
        location: "fort",
        era: "medieval",
        time: "night",
        weather: "clear",
        props: ["lanterns", "cart"],
        rim: "#FFD08A",
    },
    rajasthan_fort_day: {
        location: "fort",
        time: "day",
        weather: "clear",
        props: ["cactus", "cart"],
    },
    palace_hall: {
        location: "palace",
        era: "medieval",
        time: "day",
        props: ["lanterns", "statue"],
    },
    haunted_village: {
        location: "village",
        time: "night",
        weather: "fog",
        props: ["well", "lanterns"],
        rim: "#B9C8FF",
    },
    village_day: {
        location: "village",
        time: "day",
        weather: "cloudy",
        props: ["well", "cart", "pots"],
    },
    city_night: {
        location: "city",
        era: "modern",
        time: "night",
        weather: "clear",
        props: ["crates"],
        rim: "#9FD8FF",
    },
    jungle: {
        location: "jungle",
        time: "day",
        weather: "clear",
        props: ["rocks", "stumps"],
    },
    beach_sunset: {
        location: "beach",
        time: "sunset",
        weather: "clear",
        props: ["boat", "palms"],
        rim: "#FFB07A",
    },
    stormy_sea: {
        location: "beach",
        time: "night",
        weather: "storm",
        props: ["boat", "barrels"],
        rim: "#B8D4FF",
    },
    himalaya: {
        location: "mountain",
        time: "dawn",
        weather: "snow",
        props: ["rocks", "flag"],
    },
    cave: {
        location: "cave",
        time: "night",
        props: ["torches", "rocks", "crates"],
        rim: "#FFB36B",
    },
    temple: {
        location: "temple",
        era: "ancient",
        time: "dusk",
        props: ["lanterns", "statue", "pots"],
        rim: "#FFC680",
    },
    science_lab: {
        location: "lab",
        era: "modern",
        time: "day",
        props: ["lab_bench", "globe", "telescope"],
        rim: "#BDF2FF",
    },
    classroom: {
        location: "classroom",
        era: "modern",
        time: "day",
        props: ["blackboard", "globe", "bookshelf"],
    },
    museum: {
        location: "museum",
        time: "day",
        props: ["statue", "sarcophagus", "globe"],
    },
    outer_space: {
        location: "space",
        era: "future",
        time: "night",
        weather: "clear",
        props: ["flag"],
        rim: "#9FC9FF",
    },
    moon_surface: {
        location: "moon",
        era: "modern",
        time: "night",
        props: ["crater", "flag", "rocks"],
        rim: "#CFE0FF",
    },
    gali_street: {
        location: "gali",
        time: "day",
        weather: "cloudy",
        props: ["pots", "cart"],
    },
    desert_camp: {
        location: "desert",
        time: "night",
        weather: "clear",
        props: ["campfire", "cactus", "rocks"],
        rim: "#FFB15C",
    },
};

/** Topic keywords (Hindi + English) → preset, for template / fallback picks. */
const TOPIC_RULES = [
    [
        /tunguska|siberia|साइबेरिया|तुंगुस्का|meteor|उल्का|asteroid|क्षुद्रग्रह/i,
        ["siberian_forest", "siberian_blast", "snowy_taiga"],
    ],
    [
        /pyramid|egypt|pharaoh|mummy|पिरामिड|मिस्र|फ़िरौन|फिरौन|ममी/i,
        ["egypt_desert", "egypt_tomb", "museum"],
    ],
    [
        /fort|bhangarh|rajasthan|किला|किले|भानगढ़|राजस्थान|maharaja|महाराज/i,
        ["rajasthan_fort_night", "rajasthan_fort_day", "palace_hall"],
    ],
    [
        /ghost|haunted|भूत|प्रेत|चुड़ैल|आत्मा|horror|डरावन/i,
        ["haunted_village", "rajasthan_fort_night", "cave"],
    ],
    [
        /moon|चाँद|चांद|चंद्र|apollo|lunar/i,
        ["moon_surface", "outer_space", "science_lab"],
    ],
    [
        /space|planet|galaxy|star|अंतरिक्ष|ग्रह|तारे|ब्रह्मांड|nasa|isro|rocket|रॉकेट/i,
        ["outer_space", "moon_surface", "science_lab"],
    ],
    [
        /sea|ocean|titanic|ship|bermuda|समुद्र|जहाज|सागर|island|द्वीप/i,
        ["stormy_sea", "beach_sunset", "museum"],
    ],
    [/jungle|forest|amazon|जंगल|वन/i, ["jungle", "cave", "village_day"]],
    [
        /himalaya|mountain|everest|हिमालय|पहाड़|पर्वत/i,
        ["himalaya", "temple", "cave"],
    ],
    [
        /temple|मंदिर|god|देव|mythology|पौराणिक/i,
        ["temple", "palace_hall", "cave"],
    ],
    [
        /science|experiment|lab|scientist|विज्ञान|प्रयोग|वैज्ञानिक|dna|atom|परमाणु/i,
        ["science_lab", "classroom", "museum"],
    ],
    [
        /history|museum|इतिहास|संग्रहालय|ancient|प्राचीन/i,
        ["museum", "palace_hall", "temple"],
    ],
    [
        /desert|रेगिस्तान|sahara|thar|थार/i,
        ["desert_camp", "egypt_desert", "rajasthan_fort_day"],
    ],
    [
        /city|मुंबई|दिल्ली|शहर|robot|ai |computer|internet/i,
        ["city_night", "science_lab", "classroom"],
    ],
    [
        /village|गाँव|गांव|farmer|किसान/i,
        ["village_day", "haunted_village", "gali_street"],
    ],
];

const TIME_SKY = {
    dawn: ["#F59C8B", "#FFDDB0"],
    day: ["#3FB2F2", "#CDEFFF"],
    sunset: ["#E8665A", "#FFC46B"],
    dusk: ["#3E2F73", "#C4688E"],
    night: ["#121233", "#3A3466"],
};

const HEX = /^#[0-9a-f]{6}$/i;
const pick = (v, list, fb) => (list.includes(v) ? v : fb);

function mix(a, b, k) {
    const pa = Number.parseInt(a.slice(1), 16);
    const pb = Number.parseInt(b.slice(1), 16);
    const c = [16, 8, 0].map((s) => {
        const x = (pa >> s) & 255;
        const y = (pb >> s) & 255;
        return Math.round(x + (y - x) * k);
    });
    return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function aliasLocation(raw) {
    const s = String(raw || "")
        .toLowerCase()
        .trim()
        .replace(/[\s-]+/g, "_");
    if (LOCATIONS.includes(s)) return s;
    const A = [
        [/siberia|taiga|pine|snow_forest/, "taiga"],
        [/blast|explosion|flattened/, "blast_zone"],
        [/tomb|crypt|catacomb|underground/, "tomb"],
        [/pyramid|egypt/, "pyramids"],
        [/fort|castle|qila/, "fort"],
        [/palace|hall|court|mahal/, "palace"],
        [/village|farm|gaon/, "village"],
        [/city|street|town|market|bazaar/, "city"],
        [/lane|gali|neighbourhood|neighborhood/, "gali"],
        [/jungle|forest|wood/, "jungle"],
        [/beach|sea|ocean|coast|shore|island|ship/, "beach"],
        [/mountain|himalaya|hill|peak/, "mountain"],
        [/cave|mine/, "cave"],
        [/temple|shrine|mandir/, "temple"],
        [/lab|laborator/, "lab"],
        [/class|school/, "classroom"],
        [/museum|library|gallery/, "museum"],
        [/space|station|orbit|galaxy/, "space"],
        [/moon|mars|planet|lunar|asteroid/, "moon"],
        [/desert|sahara|thar|dune/, "desert"],
    ];
    for (const [re, id] of A) if (re.test(s)) return id;
    return null;
}

/**
 * Validate a setting spec (or preset name). Never throws.
 * @returns normalized spec with a stable `id`
 */
export function normalizeSetting(raw, fallback = "gali") {
    let src = raw;
    if (typeof src === "string") {
        const key = src
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_");
        if (SETTING_PRESETS[key]) src = { preset: key };
        else src = { location: key };
    }
    if (!src || typeof src !== "object") src = { location: fallback };
    const preset =
        SETTING_PRESETS[
            String(src.preset || "")
                .toLowerCase()
                .replace(/[\s-]+/g, "_")
        ] || null;
    const base = { ...(preset || {}) };
    const location =
        aliasLocation(src.location) ||
        base.location ||
        aliasLocation(fallback) ||
        "gali";
    const time = pick(
        String(src.time || src.timeOfDay || "").toLowerCase(),
        TIMES,
        base.time || "day",
    );
    let weather = pick(
        String(src.weather || src.skyEvent || "").toLowerCase(),
        WEATHERS,
        base.weather || "clear",
    );
    if (INTERIORS.has(location) && !["fog", "smoke"].includes(weather))
        weather = "clear";
    if (location === "space" || location === "moon") weather = "clear";
    const propsIn = Array.isArray(src.props) ? src.props : base.props || [];
    const props = [
        ...new Set(
            propsIn
                .map((p) =>
                    String(p)
                        .toLowerCase()
                        .replace(/[\s-]+/g, "_"),
                )
                .filter((p) => SETTING_PROPS.includes(p)),
        ),
    ].slice(0, 4);
    const pal =
        src.palette && typeof src.palette === "object" ? src.palette : {};
    const palette = {};
    for (const k of ["skyTop", "skyBottom", "ground", "accent", "wall"]) {
        if (HEX.test(String(pal[k] || ""))) palette[k] = pal[k];
    }
    const rim = HEX.test(String(src.rim || "")) ? src.rim : base.rim || null;
    const era = String(src.era || base.era || "")
        .slice(0, 24)
        .replace(/[^\w\s-]/g, "");
    const spec = {
        location,
        era,
        time,
        weather,
        props,
        palette,
        rim,
        variant: Math.abs(Number.parseInt(src.variant, 10) || 0) % 97,
    };
    spec.id = `set-${hashString(JSON.stringify(spec)).toString(16).slice(0, 8)}`;
    if (preset) spec.preset = String(src.preset).toLowerCase();
    return spec;
}

const REGISTRY = new Map();

/** Register a setting; returns its background id. */
export function registerSetting(raw, fallback) {
    const spec = normalizeSetting(raw, fallback);
    REGISTRY.set(spec.id, spec);
    return spec.id;
}

export function getSetting(id) {
    return REGISTRY.get(id) || null;
}

export function isSettingId(id) {
    return typeof id === "string" && REGISTRY.has(id);
}

/** Preset list for a topic / text (falls back to a varied default trio). */
export function settingsForText(text) {
    for (const [re, list] of TOPIC_RULES)
        if (re.test(String(text || ""))) return list;
    return ["gali_street", "city_night", "museum"];
}

/**
 * Make consecutive parts look different: same id twice in a row gets a new
 * variant (and, if still equal, a different time of day).
 */
export function diversifySettings(specs) {
    const out = [];
    for (let i = 0; i < specs.length; i++) {
        let s = normalizeSetting(specs[i]);
        const prev = out[i - 1];
        if (prev && prev.location === s.location && prev.time === s.time) {
            const ti = TIMES.indexOf(s.time);
            s = normalizeSetting({
                ...s,
                variant: s.variant + 7 * i + 1,
                time: INTERIORS.has(s.location)
                    ? s.time
                    : TIMES[(ti + 2) % TIMES.length],
            });
        }
        out.push(s);
    }
    return out;
}

// ---------------------------------------------------------------- drawing

function skyColors(spec) {
    if (spec.location === "space" || spec.location === "moon")
        return [
            spec.palette.skyTop || "#070720",
            spec.palette.skyBottom || "#1D1A4A",
        ];
    let [top, bot] = TIME_SKY[spec.time] || TIME_SKY.day;
    if (spec.weather === "storm" || spec.weather === "rain") {
        top = mix(top, "#2B2F45", 0.6);
        bot = mix(bot, "#59607A", 0.6);
    }
    if (spec.weather === "fog") bot = mix(bot, "#C9CCD8", 0.5);
    if (spec.weather === "smoke") {
        top = mix(top, "#5A3A3A", 0.45);
        bot = mix(bot, "#E0884A", 0.35);
    }
    return [spec.palette.skyTop || top, spec.palette.skyBottom || bot];
}

const isDark = (spec) =>
    spec.time === "night" ||
    spec.time === "dusk" ||
    spec.location === "space" ||
    spec.location === "moon";

function cloudShape(x, y, s, fill, shade) {
    const P = [
        [-0.9, 0.1, 0.45],
        [-0.4, -0.25, 0.6],
        [0.25, -0.35, 0.68],
        [0.85, 0, 0.5],
        [0.2, 0.15, 0.55],
    ];
    let a = "";
    let b = "";
    for (const [dx, dy, r] of P) {
        a += `<circle cx="${n(x + dx * s)}" cy="${n(y + dy * s + s * 0.12)}" r="${n(r * s)}" fill="${shade}"/>`;
        b += `<circle cx="${n(x + dx * s)}" cy="${n(y + dy * s)}" r="${n(r * s)}" fill="${fill}"/>`;
    }
    return a + b;
}

function drawSky(spec, L, t, rand) {
    const { width: W, height: H } = L;
    const [top, bot] = skyColors(spec);
    const gid = `sg${spec.id.slice(4)}`;
    let s = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs>`;
    s += `<rect x="${n(-W * 0.4)}" y="${n(-H * 0.4)}" width="${n(W * 1.8)}" height="${n(H * 1.8)}" fill="url(#${gid})"/>`;
    if (INTERIORS.has(spec.location)) return s;
    if (isDark(spec)) {
        const count = spec.location === "space" ? 140 : 70;
        for (let i = 0; i < count; i++) {
            const x = -W * 0.3 + rand() * W * 1.6;
            const y =
                -H * 0.2 +
                rand() * H * (spec.location === "space" ? 1.2 : 0.62);
            const tw = 0.55 + 0.45 * Math.sin(t * (1.5 + rand() * 2) + i);
            s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(1.5 + rand() * 2.8)}" fill="#FFFFFF" opacity="${n(tw * 0.9)}"/>`;
        }
    }
    const vertical = L.vertical;
    const bx = W * (0.7 + (spec.variant % 3) * 0.08);
    const by = H * (vertical ? 0.14 : 0.16);
    if (spec.location === "space") {
        // big ringed planet + a small moon
        const R = Math.min(W, H) * 0.2;
        const px = W * (spec.variant % 2 ? 0.25 : 0.72);
        const py = H * 0.28;
        s += `<circle cx="${n(px)}" cy="${n(py)}" r="${n(R)}" fill="#E07A5F" ${ln(5)}/>`;
        s += `<path d="M ${n(px - R)} ${n(py - R * 0.1)} Q ${n(px)} ${n(py + R * 0.2)} ${n(px + R)} ${n(py - R * 0.1)}" fill="none" stroke="#F2A97F" stroke-width="${n(R * 0.18)}" opacity="0.8"/>`;
        s += `<ellipse cx="${n(px)}" cy="${n(py)}" rx="${n(R * 1.7)}" ry="${n(R * 0.36)}" fill="none" stroke="#F5D58A" stroke-width="${n(R * 0.1)}" transform="rotate(-14 ${n(px)} ${n(py)})"/>`;
        s += `<circle cx="${n(W - px * 0.8)}" cy="${n(H * 0.12)}" r="${n(R * 0.3)}" fill="#BFD7F2" ${ln(4)}/>`;
        return s;
    }
    if (spec.location === "moon") {
        const R = Math.min(W, H) * 0.12;
        s += `<circle cx="${n(W * 0.78)}" cy="${n(H * 0.2)}" r="${n(R)}" fill="#3E7BD6" ${ln(5)}/>`;
        s += `<path d="M ${n(W * 0.78 - R * 0.6)} ${n(H * 0.2 - R * 0.3)} q ${n(R * 0.3)} ${n(-R * 0.3)} ${n(R * 0.6)} 0 q ${n(R * 0.2)} ${n(R * 0.4)} ${n(-R * 0.3)} ${n(R * 0.6)} z" fill="#4DB35A"/>`;
        return s;
    }
    // sun / moon
    if (spec.weather !== "storm" && spec.weather !== "fireball") {
        if (spec.time === "night" || spec.time === "dusk") {
            const r = Math.min(W, H) * 0.06;
            s += `<circle cx="${n(bx)}" cy="${n(by)}" r="${n(r * 1.8)}" fill="#FFF6C8" opacity="0.18"/><circle cx="${n(bx)}" cy="${n(by)}" r="${n(r)}" fill="#FFF3C4" ${ln(4)}/><circle cx="${n(bx + r * 0.38)}" cy="${n(by - r * 0.18)}" r="${n(r * 0.86)}" fill="${top}"/>`;
        } else {
            const r = Math.min(W, H) * (spec.time === "day" ? 0.06 : 0.09);
            const sy = spec.time === "day" ? by : L.horizonY - r * 0.6;
            s += `<circle cx="${n(bx)}" cy="${n(sy)}" r="${n(r * 1.7)}" fill="#FFE98A" opacity="0.35"/><circle cx="${n(bx)}" cy="${n(sy)}" r="${n(r)}" fill="${spec.time === "day" ? "#FFD93B" : "#FFB347"}" stroke="#FF9F2E" stroke-width="5"/>`;
        }
    }
    if (spec.weather === "fireball") {
        // the sky event: a blazing ball with rays and a glowing trail
        const fx = W * (spec.variant % 2 ? 0.34 : 0.56);
        const fy = H * (vertical ? 0.24 : 0.2);
        const R = Math.min(W, H) * 0.09 * (1 + 0.04 * Math.sin(t * 9));
        // glowing smoke trail from the upper left
        s += `<path d="M ${n(fx - R * 0.7)} ${n(fy - R * 0.5)} Q ${n(fx - W * 0.2)} ${n(fy - H * 0.12)} ${n(fx - W * 0.45)} ${n(fy - H * 0.3)} L ${n(fx - W * 0.42)} ${n(fy - H * 0.34)} Q ${n(fx - W * 0.16)} ${n(fy - H * 0.2)} ${n(fx + R * 0.1)} ${n(fy - R * 0.95)} Z" fill="#FF7A3A" opacity="0.35"/>`;
        s += `<circle cx="${n(fx)}" cy="${n(fy)}" r="${n(R * 4.5)}" fill="#FF5A2A" opacity="0.12"/>`;
        for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2 + t * 0.4;
            const L1 =
                R *
                (1.3 + 0.5 * ((i * 7) % 3)) *
                (1 + 0.15 * Math.sin(t * 6 + i));
            s += `<path d="M ${n(fx + Math.cos(a - 0.06) * R * 0.9)} ${n(fy + Math.sin(a - 0.06) * R * 0.9)} L ${n(fx + Math.cos(a) * L1 * 1.4)} ${n(fy + Math.sin(a) * L1 * 1.4)} L ${n(fx + Math.cos(a + 0.06) * R * 0.9)} ${n(fy + Math.sin(a + 0.06) * R * 0.9)} Z" fill="${i % 2 ? "#FF7A2E" : "#FFB347"}" opacity="0.85"/>`;
        }
        s += `<circle cx="${n(fx)}" cy="${n(fy)}" r="${n(R * 2.6)}" fill="#FF8C3A" opacity="0.2"/>`;
        // jagged, flickering flame layers (an explosion, not a calm sun)
        const blob = (rad, jag, ph) => {
            let d = "";
            for (let i = 0; i < 28; i++) {
                const a = (i / 28) * Math.PI * 2;
                const k =
                    1 +
                    jag *
                        (i % 2 ? -0.6 : 1) *
                        (0.6 + 0.4 * Math.sin(t * 7 + i * 1.7 + ph));
                d += `${i ? "L" : "M"} ${n(fx + Math.cos(a) * rad * k)} ${n(fy + Math.sin(a) * rad * k)} `;
            }
            return `${d}Z`;
        };
        s += `<path d="${blob(R * 1.55, 0.28, 0)}" fill="#E8401E" opacity="0.9"/>`;
        s += `<path d="${blob(R * 1.2, 0.22, 2)}" fill="#FF8A1E"/>`;
        s += `<path d="${blob(R * 0.85, 0.16, 4)}" fill="#FFC23A"/>`;
        s += `<path d="${blob(R * 0.5, 0.12, 6)}" fill="#FFF4C4"/>`;
        for (let i = 0; i < 26; i++) {
            const a = rand() * Math.PI * 2;
            const d =
                R *
                (1.8 + rand() * 2.6) *
                (1 + 0.1 * ((t * 0.7 + i * 0.13) % 1));
            s += `<circle cx="${n(fx + Math.cos(a) * d)}" cy="${n(fy + Math.sin(a) * d)}" r="${n(2 + rand() * 4)}" fill="#FFD27A" opacity="${n(0.5 + rand() * 0.5)}"/>`;
        }
    }
    if (spec.weather === "aurora") {
        for (let k = 0; k < 3; k++) {
            let d = `M ${n(-W * 0.3)} ${n(H * (0.18 + k * 0.06))}`;
            for (let i = 1; i <= 8; i++) {
                d += ` Q ${n(-W * 0.3 + (i - 0.5) * W * 0.2)} ${n(H * (0.1 + k * 0.06) + Math.sin(t * 0.6 + i + k) * 30)} ${n(-W * 0.3 + i * W * 0.2)} ${n(H * (0.18 + k * 0.06))}`;
            }
            s += `<path d="${d}" fill="none" stroke="${["#6CF2B0", "#7BD8FF", "#B48BFF"][k]}" stroke-width="${n(H * 0.03)}" opacity="0.35" stroke-linecap="round"/>`;
        }
    }
    const cloudy = ["cloudy", "rain", "storm", "smoke"].includes(spec.weather);
    const nClouds = cloudy ? 6 : spec.time === "day" ? 3 : 2;
    const cf = isDark(spec)
        ? mix(bot, "#FFFFFF", 0.18)
        : spec.weather === "storm"
          ? "#7C819A"
          : spec.weather === "smoke"
            ? "#8A6A62"
            : "#FFFFFF";
    const cs = mix(cf, top, 0.35);
    for (let i = 0; i < nClouds; i++) {
        const x = (-W * 0.2 + rand() * W * 1.4 + t * (8 + i * 3)) % (W * 1.5);
        const y = H * (0.06 + rand() * (vertical ? 0.3 : 0.22));
        s += cloudShape(x, y, H * (0.04 + rand() * 0.04), cf, cs);
    }
    if (spec.weather === "storm" && Math.sin(t * 1.7) > 0.96) {
        const x = W * (0.2 + rand() * 0.6);
        s += `<path d="M ${n(x)} ${n(H * 0.05)} L ${n(x - 30)} ${n(H * 0.22)} L ${n(x + 10)} ${n(H * 0.22)} L ${n(x - 26)} ${n(H * 0.42)}" fill="none" stroke="#FFF6B0" stroke-width="8" stroke-linejoin="round"/>`;
    }
    return s;
}

function pine(x, base, h, col, trunk, outline = true) {
    const w = h * 0.36;
    const o = outline ? ln(3.5) : "";
    let s = `<rect x="${n(x - h * 0.03)}" y="${n(base - h * 0.16)}" width="${n(h * 0.06)}" height="${n(h * 0.16)}" fill="${trunk}" ${o}/>`;
    for (let k = 0; k < 3; k++) {
        const ty = base - h * (0.12 + k * 0.27);
        const ww = w * (1 - k * 0.25);
        s += `<path d="M ${n(x - ww)} ${n(ty)} L ${n(x)} ${n(ty - h * 0.42)} L ${n(x + ww)} ${n(ty)} Z" fill="${col}" ${o}/>`;
    }
    return s;
}

function drawFar(spec, L, rand) {
    const { width: W, height: H } = L;
    const [, bot] = skyColors(spec);
    const hz = L.horizonY;
    const loc = spec.location;
    const haze = (c, k = 0.5) => mix(c, bot, k);
    let s = "";
    if (INTERIORS.has(loc)) return "";
    if (
        [
            "taiga",
            "blast_zone",
            "mountain",
            "jungle",
            "village",
            "fort",
            "temple",
        ].includes(loc)
    ) {
        // mountain range
        let d = `M ${n(-W * 0.4)} ${n(hz)}`;
        const peaks = 7;
        for (let i = 0; i <= peaks; i++) {
            const x = -W * 0.4 + (i / peaks) * W * 1.8;
            const ph =
                H *
                (loc === "mountain"
                    ? 0.24 + rand() * 0.16
                    : 0.08 + rand() * 0.1);
            d += ` L ${n(x - W * 0.05)} ${n(hz - ph * 0.6)} L ${n(x)} ${n(hz - ph)} L ${n(x + W * 0.06)} ${n(hz - ph * 0.55)}`;
        }
        d += ` L ${n(W * 1.4)} ${n(hz)} Z`;
        const mc = loc === "mountain" ? "#8A9AC8" : "#6C6A9A";
        s += `<path d="${d}" fill="${haze(mc, isDark(spec) ? 0.35 : 0.45)}" ${ln(3)}/>`;
        if (loc === "mountain" || spec.weather === "snow") {
            // snow caps
            s += `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="10" opacity="0.65"/>`;
        }
    }
    if (loc === "taiga" || loc === "blast_zone") {
        const col = haze(loc === "blast_zone" ? "#4E4A3A" : "#2F5E4A", 0.4);
        for (let i = 0; i < 26; i++) {
            const x = -W * 0.35 + i * W * 0.068 + rand() * 30;
            const h = H * (0.1 + rand() * 0.06);
            if (loc === "blast_zone" && rand() < 0.6) {
                // bare, scorched poles
                s += `<path d="M ${n(x)} ${n(hz + 4)} L ${n(x + 4)} ${n(hz - h * 0.8)}" stroke="${col}" stroke-width="6" stroke-linecap="round"/>`;
            } else s += pine(x, hz + 4, h, col, col, false);
        }
    }
    if (loc === "pyramids" || loc === "desert") {
        let d = `M ${n(-W * 0.4)} ${n(hz)}`;
        for (let i = 0; i <= 6; i++) {
            const x = -W * 0.4 + (i / 6) * W * 1.8;
            d += ` Q ${n(x - W * 0.08)} ${n(hz - H * (0.04 + rand() * 0.05))} ${n(x)} ${n(hz)}`;
        }
        s += `<path d="${d} Z" fill="${haze("#E6B66A", 0.35)}" ${ln(3)}/>`;
        if (loc === "pyramids") {
            for (const [px, ps] of [
                [W * 0.18, 0.2],
                [W * 0.42, 0.3],
                [W * 0.82, 0.24],
            ]) {
                const h = H * ps * (L.vertical ? 0.7 : 1);
                const base = hz + 6;
                s += `<path d="M ${n(px - h * 0.95)} ${n(base)} L ${n(px)} ${n(base - h)} L ${n(px + h * 0.95)} ${n(base)} Z" fill="${haze("#E8BE72", 0.25)}" ${ln(4)}/>`;
                s += `<path d="M ${n(px)} ${n(base - h)} L ${n(px + h * 0.95)} ${n(base)} L ${n(px + h * 0.25)} ${n(base)} Z" fill="${haze("#C9974F", 0.25)}"/>`;
                for (let k = 1; k < 6; k++) {
                    const y = base - (h * k) / 6;
                    const hw = (h * 0.95 * (6 - k)) / 6;
                    s += `<path d="M ${n(px - hw)} ${n(y)} L ${n(px + hw)} ${n(y)}" stroke="${LINE}" stroke-width="2" opacity="0.35"/>`;
                }
            }
        }
    }
    if (loc === "city") {
        for (let i = 0; i < 18; i++) {
            const x = -W * 0.35 + i * W * 0.1;
            const h = H * (0.12 + rand() * 0.22);
            const w = W * (0.06 + rand() * 0.04);
            s += `<rect x="${n(x)}" y="${n(hz - h)}" width="${n(w)}" height="${n(h + 6)}" fill="${haze("#4A4E7A", 0.3)}" ${ln(3)}/>`;
            for (let k = 0; k < 10; k++) {
                if (rand() < 0.45) continue;
                s += `<rect x="${n(x + 8 + ((k % 3) * (w - 16)) / 3)}" y="${n(hz - h + 14 + Math.floor(k / 3) * 26)}" width="${n((w - 24) / 3)}" height="12" fill="${isDark(spec) ? "#FFD97A" : "#BFD8F2"}" opacity="0.85"/>`;
            }
        }
    }
    if (loc === "beach") {
        s += `<rect x="${n(-W * 0.4)}" y="${n(hz - H * 0.02)}" width="${n(W * 1.8)}" height="${n(H * 0.2)}" fill="${haze(spec.weather === "storm" ? "#2C4A6E" : "#2F86C9", 0.25)}"/>`;
        for (let i = 0; i < 14; i++) {
            const y = hz + rand() * H * 0.1;
            const x = -W * 0.3 + rand() * W * 1.6;
            s += `<path d="M ${n(x)} ${n(y)} q 20 -10 40 0 q 20 10 40 0" fill="none" stroke="#FFFFFF" stroke-width="4" opacity="0.6"/>`;
        }
    }
    if (loc === "gali") {
        for (let i = 0; i < 12; i++) {
            const x = -W * 0.35 + i * W * 0.15;
            const h = H * (0.1 + rand() * 0.1);
            s += `<rect x="${n(x)}" y="${n(hz - h)}" width="${n(W * 0.13)}" height="${n(h)}" fill="${haze(["#F2A65A", "#7FC8A9", "#E58FA6", "#A5B8F0"][i % 4], 0.45)}" ${ln(3)}/>`;
        }
    }
    if (loc === "moon") {
        let d = `M ${n(-W * 0.4)} ${n(hz)}`;
        for (let i = 0; i <= 8; i++) {
            const x = -W * 0.4 + (i / 8) * W * 1.8;
            d += ` Q ${n(x - W * 0.06)} ${n(hz - H * (0.03 + rand() * 0.06))} ${n(x)} ${n(hz)}`;
        }
        s += `<path d="${d} Z" fill="#7D7E92" ${ln(3)}/>`;
    }
    return s;
}

function arch(x, base, w, h, fill, inner) {
    return `<path d="M ${n(x - w / 2)} ${n(base)} L ${n(x - w / 2)} ${n(base - h + w / 2)} A ${n(w / 2)} ${n(w / 2)} 0 0 1 ${n(x + w / 2)} ${n(base - h + w / 2)} L ${n(x + w / 2)} ${n(base)} Z" fill="${fill}" ${ln(4)}/>${inner ? `<path d="M ${n(x - w * 0.34)} ${n(base)} L ${n(x - w * 0.34)} ${n(base - h + w / 2)} A ${n(w * 0.34)} ${n(w * 0.34)} 0 0 1 ${n(x + w * 0.34)} ${n(base - h + w / 2)} L ${n(x + w * 0.34)} ${n(base)} Z" fill="${inner}" ${ln(3)}/>` : ""}`;
}

function torch(x, y, t, k = 1) {
    const f = 1 + 0.12 * Math.sin(t * 13 + x);
    return `<circle cx="${n(x)}" cy="${n(y - 26 * k)}" r="${n(60 * k)}" fill="#FFB347" opacity="0.18"/><rect x="${n(x - 6 * k)}" y="${n(y - 20 * k)}" width="${n(12 * k)}" height="${n(52 * k)}" fill="#6B4430" ${ln(3)}/><path d="M ${n(x - 14 * k)} ${n(y - 20 * k)} Q ${n(x - 12 * k)} ${n(y - 52 * k * f)} ${n(x)} ${n(y - 66 * k * f)} Q ${n(x + 14 * k)} ${n(y - 46 * k * f)} ${n(x + 14 * k)} ${n(y - 20 * k)} Z" fill="#FF8C2A" ${ln(3)}/><path d="M ${n(x - 7 * k)} ${n(y - 22 * k)} Q ${n(x - 4 * k)} ${n(y - 42 * k * f)} ${n(x + 2 * k)} ${n(y - 50 * k * f)} Q ${n(x + 8 * k)} ${n(y - 36 * k)} ${n(x + 7 * k)} ${n(y - 22 * k)} Z" fill="#FFE07A"/>`;
}

function drawMid(spec, L, t, rand) {
    const { width: W, height: H } = L;
    const hz = L.horizonY;
    const loc = spec.location;
    const dark = isDark(spec);
    const night = (c, k = 0.4) => (dark ? mix(c, "#1C1A3A", k) : c);
    let s = "";
    if (INTERIORS.has(loc)) {
        // back wall from the ceiling down to the floor line
        const wall =
            spec.palette.wall ||
            {
                tomb: "#B88A52",
                palace: "#F2D9B0",
                cave: "#5E5470",
                lab: "#DDEBF2",
                classroom: "#F5E6C8",
                museum: "#E9DCCB",
                temple: "#E8B07A",
            }[loc];
        const w2 = night(wall, loc === "tomb" || loc === "cave" ? 0.25 : 0.12);
        s += `<rect x="${n(-W * 0.4)}" y="${n(-H * 0.4)}" width="${n(W * 1.8)}" height="${n(hz + H * 0.4 + 8)}" fill="${w2}"/>`;
        if (loc === "tomb") {
            // stone blocks + original carved glyph rows (simple geometric marks)
            const bw = W * 0.12;
            const bh = H * 0.07;
            for (let r = 0; r * bh < hz + H * 0.3; r++) {
                for (let c = -4; c * bw < W * 1.4; c++) {
                    const x = c * bw + (r % 2) * bw * 0.5;
                    const y = hz - (r + 1) * bh;
                    s += `<rect x="${n(x)}" y="${n(y)}" width="${n(bw)}" height="${n(bh)}" fill="none" stroke="${mix(w2, "#000000", 0.25)}" stroke-width="3"/>`;
                }
            }
            for (let c = 0; c < 5; c++) {
                const x = W * (0.08 + c * 0.2);
                const y = hz - H * (L.vertical ? 0.34 : 0.42);
                s += `<rect x="${n(x - W * 0.05)}" y="${n(y)}" width="${n(W * 0.1)}" height="${n(H * 0.22)}" fill="${mix(w2, "#FFFFFF", 0.12)}" ${ln(3)}/>`;
                for (let g = 0; g < 4; g++) {
                    const gy = y + H * 0.03 + g * H * 0.048;
                    const kind = Math.floor(rand() * 4);
                    const gx = x - W * 0.02;
                    s +=
                        kind === 0
                            ? `<circle cx="${n(gx + 10)}" cy="${n(gy + 10)}" r="9" fill="none" ${ln(3)}/>`
                            : kind === 1
                              ? `<path d="M ${n(gx)} ${n(gy + 20)} L ${n(gx + 10)} ${n(gy)} L ${n(gx + 20)} ${n(gy + 20)}" fill="none" ${ln(3)}/>`
                              : kind === 2
                                ? `<path d="M ${n(gx)} ${n(gy + 10)} Q ${n(gx + 14)} ${n(gy - 4)} ${n(gx + 26)} ${n(gy + 10)}" fill="none" ${ln(3)}/>`
                                : `<rect x="${n(gx + 2)}" y="${n(gy + 2)}" width="18" height="16" fill="none" ${ln(3)}/>`;
                    s += `<path d="M ${n(gx + 30)} ${n(gy + 4)} L ${n(gx + 30)} ${n(gy + 18)}" ${ln(3)}/>`;
                }
            }
        }
        if (loc === "cave") {
            for (let i = 0; i < 14; i++) {
                const x = -W * 0.3 + rand() * W * 1.6;
                const len = H * (0.06 + rand() * 0.14);
                s += `<path d="M ${n(x - 26)} ${n(-H * 0.02)} L ${n(x)} ${n(len)} L ${n(x + 26)} ${n(-H * 0.02)} Z" fill="${mix(w2, "#000000", 0.2)}" ${ln(3)}/>`;
            }
            for (let i = 0; i < 9; i++) {
                const x = -W * 0.3 + rand() * W * 1.6;
                const y = hz - rand() * H * 0.4;
                s += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(40 + rand() * 60)}" ry="${n(20 + rand() * 30)}" fill="${mix(w2, "#000000", 0.12)}"/>`;
            }
        }
        if (loc === "palace") {
            for (let c = -1; c < 7; c++) {
                const x = W * (c * 0.18);
                const ah = H * (L.vertical ? 0.36 : 0.5);
                s += arch(
                    x + W * 0.09,
                    hz + 4,
                    W * 0.12,
                    ah,
                    night("#E5BE86", 0.2),
                    night("#7C4E9C", 0.3),
                );
                s += `<rect x="${n(x - W * 0.012)}" y="${n(hz - ah - 20)}" width="${n(W * 0.024)}" height="${n(ah + 24)}" fill="${night("#C99A5A", 0.2)}" ${ln(3)}/>`;
            }
            s += `<path d="M ${n(-W * 0.4)} ${n(H * 0.06)} Q ${n(W * 0.1)} ${n(H * 0.16)} ${n(W * 0.5)} ${n(H * 0.06)} Q ${n(W * 0.9)} ${n(H * 0.16)} ${n(W * 1.4)} ${n(H * 0.06)} L ${n(W * 1.4)} ${n(-H * 0.2)} L ${n(-W * 0.4)} ${n(-H * 0.2)} Z" fill="${spec.palette.accent || "#C0304A"}" ${ln(4)}/>`;
        }
        if (loc === "lab") {
            for (let c = 0; c < 4; c++) {
                const x = W * (0.04 + c * 0.26);
                const y = hz - H * (L.vertical ? 0.3 : 0.4);
                if (c % 2 === 0) {
                    // wall screen with a graph
                    s += `<rect x="${n(x)}" y="${n(y)}" width="${n(W * 0.18)}" height="${n(H * 0.16)}" rx="10" fill="#22334A" ${ln(4)}/>`;
                    let d = `M ${n(x + 14)} ${n(y + H * 0.12)}`;
                    for (let k = 1; k <= 8; k++)
                        d += ` L ${n(x + 14 + k * W * 0.019)} ${n(y + H * (0.12 - 0.08 * Math.abs(Math.sin(k * 1.3 + t * 0.8))))}`;
                    s += `<path d="${d}" fill="none" stroke="#6CF2B0" stroke-width="4"/>`;
                } else {
                    // shelf with flasks
                    s += `<rect x="${n(x)}" y="${n(y + H * 0.12)}" width="${n(W * 0.18)}" height="10" fill="#9AA7B5" ${ln(3)}/>`;
                    for (let k = 0; k < 4; k++) {
                        const fx = x + 20 + k * W * 0.04;
                        const col = [
                            "#6CF2B0",
                            "#FF7E96",
                            "#7BD8FF",
                            "#FFD93B",
                        ][k];
                        s += `<path d="M ${n(fx - 6)} ${n(y + H * 0.06)} L ${n(fx - 6)} ${n(y + H * 0.085)} L ${n(fx - 16)} ${n(y + H * 0.12)} L ${n(fx + 16)} ${n(y + H * 0.12)} L ${n(fx + 6)} ${n(y + H * 0.085)} L ${n(fx + 6)} ${n(y + H * 0.06)} Z" fill="${col}" ${ln(3)}/>`;
                    }
                }
            }
        }
        if (loc === "classroom" || loc === "museum") {
            for (let c = 0; c < 4; c++) {
                const x = W * (0.06 + c * 0.25);
                const y = hz - H * (L.vertical ? 0.3 : 0.42);
                const col = ["#7FC8A9", "#F2A65A", "#A5B8F0", "#E58FA6"][c];
                s += `<rect x="${n(x)}" y="${n(y)}" width="${n(W * 0.14)}" height="${n(H * 0.15)}" fill="#C9974F" ${ln(4)}/><rect x="${n(x + 10)}" y="${n(y + 10)}" width="${n(W * 0.14 - 20)}" height="${n(H * 0.15 - 20)}" fill="${col}"/>`;
                s += `<path d="M ${n(x + 16)} ${n(y + H * 0.13)} L ${n(x + W * 0.05)} ${n(y + H * 0.06)} L ${n(x + W * 0.08)} ${n(y + H * 0.1)} L ${n(x + W * 0.1)} ${n(y + H * 0.07)} L ${n(x + W * 0.13)} ${n(y + H * 0.13)} Z" fill="${mix(col, "#000000", 0.2)}"/>`;
            }
        }
        // skirting / floor line
        s += `<rect x="${n(-W * 0.4)}" y="${n(hz - 14)}" width="${n(W * 1.8)}" height="22" fill="${mix(w2, "#000000", 0.2)}" ${ln(3)}/>`;
        return s;
    }
    if (loc === "taiga" || loc === "jungle") {
        const col = loc === "jungle" ? night("#2E8B57") : night("#2F6B4F");
        for (let i = 0; i < 16; i++) {
            const x = -W * 0.35 + i * W * 0.11 + rand() * 40;
            const h = H * (0.2 + rand() * 0.12);
            if (loc === "jungle") {
                s += `<rect x="${n(x - 10)}" y="${n(hz - h * 0.6)}" width="20" height="${n(h * 0.6 + 10)}" fill="${night("#7A5230")}" ${ln(3)}/>`;
                s += cloudShape(
                    x,
                    hz - h * 0.7,
                    h * 0.28,
                    col,
                    mix(col, "#000000", 0.2),
                );
            } else
                s += pine(
                    x,
                    hz + 10,
                    h,
                    mix(col, "#FFFFFF", spec.weather === "snow" ? 0.25 : 0),
                    night("#6B4430"),
                );
        }
    }
    if (loc === "blast_zone") {
        // flattened trees radiating away from the blast centre
        const cx = W * 0.5;
        for (let i = 0; i < 22; i++) {
            const x = -W * 0.3 + rand() * W * 1.6;
            const y = hz - H * 0.01 + rand() * H * 0.04;
            const dir = x < cx ? -1 : 1;
            const len = H * (0.08 + rand() * 0.08);
            s += `<path d="M ${n(x)} ${n(y)} L ${n(x + dir * len)} ${n(y - len * 0.12)}" stroke="${night("#5A4632")}" stroke-width="11" stroke-linecap="round"/>`;
        }
    }
    if (loc === "fort") {
        // fort wall on a rocky hill with battlements, arches and lit windows
        const top = hz - H * (L.vertical ? 0.2 : 0.3);
        const wallC = night(spec.palette.accent || "#D9965A", 0.45);
        s += `<path d="M ${n(-W * 0.4)} ${n(hz + 6)} Q ${n(W * 0.2)} ${n(hz - H * 0.06)} ${n(W * 0.5)} ${n(hz - H * 0.07)} Q ${n(W * 0.8)} ${n(hz - H * 0.06)} ${n(W * 1.4)} ${n(hz + 6)} Z" fill="${night("#B9875A", 0.5)}" ${ln(3)}/>`;
        s += `<rect x="${n(W * 0.08)}" y="${n(top)}" width="${n(W * 0.84)}" height="${n(hz - top - H * 0.04)}" fill="${wallC}" ${ln(4)}/>`;
        for (let i = 0; i < 16; i++) {
            const x = W * 0.08 + (i * (W * 0.84)) / 16;
            s += `<rect x="${n(x + 6)}" y="${n(top - 26)}" width="${n((W * 0.84) / 16 - 16)}" height="28" fill="${wallC}" ${ln(3)}/>`;
        }
        for (const tx of [W * 0.08, W * 0.5, W * 0.92]) {
            const th = H * 0.12;
            s += `<rect x="${n(tx - W * 0.05)}" y="${n(top - th)}" width="${n(W * 0.1)}" height="${n(hz - top + th - H * 0.04)}" fill="${mix(wallC, "#000000", 0.1)}" ${ln(4)}/>`;
            s += `<path d="M ${n(tx - W * 0.06)} ${n(top - th)} Q ${n(tx)} ${n(top - th - H * 0.09)} ${n(tx + W * 0.06)} ${n(top - th)} Z" fill="${mix(wallC, "#FFFFFF", 0.1)}" ${ln(4)}/>`;
        }
        for (let i = 0; i < 6; i++) {
            const x = W * (0.17 + i * 0.13);
            if (Math.abs(x - W * 0.5) < W * 0.06) continue;
            const lit = dark
                ? 0.6 + 0.4 * Math.sin(t * 2 + i) > 0.3
                    ? "#FFD27A"
                    : "#3A2A4A"
                : "#4A3050";
            s += arch(x, top + H * 0.14, W * 0.045, H * 0.09, lit);
        }
        s += arch(
            W * 0.5,
            hz - H * 0.04,
            W * 0.08,
            H * 0.14,
            night("#4A3050", 0.2),
        );
    }
    if (loc === "village") {
        for (let i = 0; i < 6; i++) {
            const x = -W * 0.2 + i * W * 0.3 + rand() * 40;
            const hw = W * 0.08;
            const hh = H * 0.12;
            s += `<rect x="${n(x - hw)}" y="${n(hz - hh)}" width="${n(hw * 2)}" height="${n(hh + 8)}" fill="${night("#D9A066")}" ${ln(4)}/>`;
            s += `<path d="M ${n(x - hw * 1.25)} ${n(hz - hh)} L ${n(x)} ${n(hz - hh - H * 0.09)} L ${n(x + hw * 1.25)} ${n(hz - hh)} Z" fill="${night("#B5793A")}" ${ln(4)}/>`;
            s += `<rect x="${n(x - hw * 0.25)}" y="${n(hz - hh * 0.6)}" width="${n(hw * 0.5)}" height="${n(hh * 0.6 + 8)}" fill="${night("#6B4430")}" ${ln(3)}/>`;
            s += `<rect x="${n(x + hw * 0.45)}" y="${n(hz - hh * 0.75)}" width="${n(hw * 0.35)}" height="${n(hh * 0.3)}" fill="${dark ? "#FFD27A" : "#7FC8E8"}" ${ln(3)}/>`;
        }
    }
    if (loc === "temple") {
        const x = W * 0.5;
        const h = H * (L.vertical ? 0.26 : 0.36);
        s += `<rect x="${n(x - W * 0.16)}" y="${n(hz - h * 0.45)}" width="${n(W * 0.32)}" height="${n(h * 0.45 + 8)}" fill="${night("#E8A15A")}" ${ln(4)}/>`;
        s += `<path d="M ${n(x - W * 0.1)} ${n(hz - h * 0.45)} Q ${n(x - W * 0.08)} ${n(hz - h * 0.9)} ${n(x)} ${n(hz - h)} Q ${n(x + W * 0.08)} ${n(hz - h * 0.9)} ${n(x + W * 0.1)} ${n(hz - h * 0.45)} Z" fill="${night("#F2B46B")}" ${ln(4)}/>`;
        s += `<path d="M ${n(x)} ${n(hz - h)} L ${n(x)} ${n(hz - h - 50)} L ${n(x + 40)} ${n(hz - h - 38)} L ${n(x)} ${n(hz - h - 26)}" fill="#FF7A2E" ${ln(3)}/>`;
        s += arch(x, hz + 4, W * 0.07, h * 0.32, night("#5A3550", 0.2));
    }
    if (loc === "city" || loc === "gali") {
        for (let i = 0; i < 8; i++) {
            const x = -W * 0.3 + i * W * 0.22;
            const h = H * (0.18 + rand() * 0.14);
            const col = night(
                ["#F2A65A", "#7FC8A9", "#E58FA6", "#A5B8F0", "#F7D774"][i % 5],
                0.35,
            );
            s += `<rect x="${n(x)}" y="${n(hz - h)}" width="${n(W * 0.2)}" height="${n(h + 8)}" fill="${col}" ${ln(4)}/>`;
            for (let k = 0; k < 2; k++) {
                s += `<rect x="${n(x + W * (0.03 + k * 0.09))}" y="${n(hz - h + H * 0.04)}" width="${n(W * 0.05)}" height="${n(H * 0.06)}" fill="${dark ? "#FFD27A" : "#BFE3F2"}" ${ln(3)}/>`;
            }
        }
    }
    if (loc === "space") {
        // station deck rail across the horizon
        s += `<rect x="${n(-W * 0.4)}" y="${n(hz - H * 0.05)}" width="${n(W * 1.8)}" height="${n(H * 0.05)}" fill="#7C86A8" ${ln(4)}/>`;
        for (let i = 0; i < 20; i++) {
            const x = -W * 0.35 + i * W * 0.09;
            s += `<circle cx="${n(x)}" cy="${n(hz - H * 0.025)}" r="7" fill="${(i + Math.floor(t * 2)) % 3 ? "#6CF2FF" : "#FF7E96"}"/>`;
        }
    }
    return s;
}

const GROUND = {
    taiga: "#E9EEF5",
    blast_zone: "#8C7A5E",
    desert: "#E8C27E",
    pyramids: "#EBC98A",
    tomb: "#9A7448",
    fort: "#D7A86E",
    palace: "#E0C9A0",
    village: "#C9A46A",
    city: "#8D8FA8",
    gali: "#EBD9B0",
    jungle: "#6FB35A",
    beach: "#F0D9A0",
    mountain: "#DDE5F0",
    cave: "#4E4560",
    temple: "#CFA272",
    lab: "#B8C7D4",
    classroom: "#C9A06A",
    museum: "#CDBBA3",
    space: "#5A6380",
    moon: "#A9AABB",
};

function drawGround(spec, L, rand) {
    const { width: W, height: H } = L;
    const hz = L.horizonY;
    let g = spec.palette.ground || GROUND[spec.location] || "#EBD9B0";
    if (
        spec.location === "taiga" &&
        spec.weather !== "snow" &&
        spec.time !== "dusk" &&
        spec.time !== "night" &&
        !spec.props.includes("fallen_trees")
    )
        g = "#7DA65A";
    if (isDark(spec)) g = mix(g, "#2A2850", 0.4);
    const det = mix(g, "#000000", 0.12);
    let s = `<rect x="${n(-W * 0.4)}" y="${n(hz)}" width="${n(W * 1.8)}" height="${n(H)}" fill="${g}"/>`;
    s += `<rect x="${n(-W * 0.4)}" y="${n(hz)}" width="${n(W * 1.8)}" height="8" fill="${det}"/>`;
    const tiles = ["lab", "classroom", "museum", "palace", "space"].includes(
        spec.location,
    );
    if (tiles) {
        for (let k = -8; k < 16; k++) {
            const x = W * 0.5 + k * W * 0.12;
            s += `<path d="M ${n(W * 0.5 + (x - W * 0.5) * 0.45)} ${n(hz)} L ${n(x)} ${n(H * 1.1)}" stroke="${det}" stroke-width="3"/>`;
        }
        for (let r = 1; r < 5; r++) {
            const y = hz + (H - hz) * (r / 5) ** 1.4;
            s += `<path d="M ${n(-W * 0.4)} ${n(y)} L ${n(W * 1.4)} ${n(y)}" stroke="${det}" stroke-width="3"/>`;
        }
    } else {
        for (let i = 0; i < 30; i++) {
            const x = -W * 0.3 + rand() * W * 1.6;
            const y = hz + H * 0.02 + rand() * (H - hz);
            s += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(8 + rand() * 18)}" ry="${n(3 + rand() * 5)}" fill="${det}" opacity="0.7"/>`;
        }
    }
    if (spec.location === "moon") {
        for (let i = 0; i < 6; i++) {
            const x = -W * 0.2 + rand() * W * 1.4;
            const y = hz + H * 0.03 + rand() * (H - hz) * 0.5;
            const r = 30 + rand() * 50;
            s += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(r)}" ry="${n(r * 0.3)}" fill="${det}" ${ln(3)}/>`;
        }
    }
    return s;
}

/** Key props, kept to the sides / back so they never sit on a character. */
function drawProps(spec, L, t, rand) {
    const { width: W, height: H } = L;
    const hz = L.horizonY;
    const dark = isDark(spec);
    const night = (c) => (dark ? mix(c, "#1C1A3A", 0.3) : c);
    // slots: far left / far right / back centre (behind the characters' plane)
    const ps = (H / 1080) * (L.vertical ? 0.62 : 1.35);
    const slots = [
        [W * 0.07, hz + (L.groundY - hz) * 0.35, 1 * ps],
        [W * 0.93, hz + (L.groundY - hz) * 0.3, 1 * ps],
        [W * 0.5, hz + 4, 0.62 * ps],
        [W * 0.32, hz + 2, 0.55 * ps],
        [W * 0.68, hz + 2, 0.55 * ps],
    ];
    let s = "";
    spec.props.forEach((p, i) => {
        const reps = [
            "fallen_trees",
            "stumps",
            "rocks",
            "pines",
            "torches",
            "lanterns",
            "cactus",
            "palms",
            "pots",
            "crates",
        ].includes(p)
            ? 2
            : 1;
        for (let r = 0; r < reps; r++) {
            const [x, y, k] = slots[(i * 2 + r) % slots.length];
            const fl = x > W / 2 ? -1 : 1;
            switch (p) {
                case "fallen_trees":
                    for (let j = 0; j < 3; j++) {
                        const xx = x + fl * j * 70 * k;
                        const yy = y + j * 14;
                        const len = 220 * k;
                        s += `<g transform="rotate(${n(fl * (6 + j * 5))} ${n(xx)} ${n(yy)})"><rect x="${n(xx - len / 2)}" y="${n(yy - 14 * k)}" width="${n(len)}" height="${n(26 * k)}" rx="${n(12 * k)}" fill="${night("#7A5234")}" ${ln(4)}/><path d="M ${n(xx + len * 0.2)} ${n(yy - 12 * k)} L ${n(xx + len * 0.32)} ${n(yy - 44 * k)}" stroke="${night("#7A5234")}" stroke-width="${n(10 * k)}" stroke-linecap="round"/><path d="M ${n(xx + len * 0.32)} ${n(yy - 6 * k)} q ${n(30 * k)} ${n(-30 * k)} ${n(70 * k)} 0" fill="${night("#2F6B4F")}" ${ln(3)}/></g>`;
                    }
                    break;
                case "stumps":
                    s += `<path d="M ${n(x - 26 * k)} ${n(y)} L ${n(x - 20 * k)} ${n(y - 50 * k)} L ${n(x - 6 * k)} ${n(y - 64 * k)} L ${n(x + 4 * k)} ${n(y - 48 * k)} L ${n(x + 20 * k)} ${n(y - 58 * k)} L ${n(x + 26 * k)} ${n(y)} Z" fill="${night("#6B4430")}" ${ln(4)}/>`;
                    break;
                case "pines":
                    s += pine(
                        x,
                        y,
                        260 * k,
                        night(spec.weather === "snow" ? "#5C8F78" : "#2F6B4F"),
                        night("#6B4430"),
                    );
                    break;
                case "rocks":
                    s += `<path d="M ${n(x - 50 * k)} ${n(y)} Q ${n(x - 46 * k)} ${n(y - 44 * k)} ${n(x)} ${n(y - 50 * k)} Q ${n(x + 50 * k)} ${n(y - 40 * k)} ${n(x + 54 * k)} ${n(y)} Z" fill="${night(spec.location === "moon" ? "#8A8B9E" : "#8F8AA0")}" ${ln(4)}/>`;
                    break;
                case "torches":
                    s += torch(x, y - 60 * k, t, k * 1.2);
                    break;
                case "lanterns": {
                    const ly = y - 150 * k;
                    s += `<path d="M ${n(x)} ${n(y)} L ${n(x)} ${n(ly)} L ${n(x + fl * 40 * k)} ${n(ly)}" fill="none" stroke="${night("#4A3A3A")}" stroke-width="${n(8 * k)}"/>`;
                    s += `<circle cx="${n(x + fl * 40 * k)}" cy="${n(ly + 34 * k)}" r="${n(70 * k)}" fill="#FFD27A" opacity="${dark ? 0.22 : 0.08}"/><rect x="${n(x + fl * 40 * k - 16 * k)}" y="${n(ly + 12 * k)}" width="${n(32 * k)}" height="${n(44 * k)}" rx="${n(8 * k)}" fill="#FFC85A" ${ln(3)}/>`;
                    break;
                }
                case "cactus":
                    s += `<path d="M ${n(x - 14 * k)} ${n(y)} L ${n(x - 14 * k)} ${n(y - 120 * k)} Q ${n(x)} ${n(y - 140 * k)} ${n(x + 14 * k)} ${n(y - 120 * k)} L ${n(x + 14 * k)} ${n(y)} Z" fill="${night("#4DA05A")}" ${ln(4)}/><path d="M ${n(x + 14 * k)} ${n(y - 60 * k)} L ${n(x + 40 * k)} ${n(y - 60 * k)} L ${n(x + 40 * k)} ${n(y - 96 * k)}" fill="none" stroke="${night("#4DA05A")}" stroke-width="${n(18 * k)}" stroke-linecap="round"/>`;
                    break;
                case "palms": {
                    const top = y - 260 * k;
                    s += `<path d="M ${n(x)} ${n(y)} Q ${n(x + fl * 30 * k)} ${n(y - 130 * k)} ${n(x + fl * 10 * k)} ${n(top)}" fill="none" stroke="${night("#8A5A32")}" stroke-width="${n(20 * k)}" stroke-linecap="round"/>`;
                    for (let j = 0; j < 5; j++) {
                        const a =
                            -2.6 + j * 0.55 + Math.sin(t * 1.4 + j) * 0.05;
                        s += `<path d="M ${n(x + fl * 10 * k)} ${n(top)} q ${n(Math.cos(a) * 60 * k)} ${n(Math.sin(a) * 60 * k - 20 * k)} ${n(Math.cos(a) * 120 * k)} ${n(Math.sin(a) * 90 * k + 30 * k)}" fill="none" stroke="${night("#3E9A4E")}" stroke-width="${n(16 * k)}" stroke-linecap="round"/>`;
                    }
                    break;
                }
                case "crates":
                    s += `<rect x="${n(x - 40 * k)}" y="${n(y - 80 * k)}" width="${n(80 * k)}" height="${n(80 * k)}" fill="${night("#C08A4A")}" ${ln(4)}/><path d="M ${n(x - 40 * k)} ${n(y - 80 * k)} L ${n(x + 40 * k)} ${n(y)} M ${n(x + 40 * k)} ${n(y - 80 * k)} L ${n(x - 40 * k)} ${n(y)}" ${ln(3)}/>`;
                    break;
                case "barrels":
                    s += `<rect x="${n(x - 34 * k)}" y="${n(y - 90 * k)}" width="${n(68 * k)}" height="${n(90 * k)}" rx="${n(18 * k)}" fill="${night("#A0623A")}" ${ln(4)}/><path d="M ${n(x - 34 * k)} ${n(y - 62 * k)} L ${n(x + 34 * k)} ${n(y - 62 * k)} M ${n(x - 34 * k)} ${n(y - 28 * k)} L ${n(x + 34 * k)} ${n(y - 28 * k)}" ${ln(4)}/>`;
                    break;
                case "sarcophagus":
                    s += `<path d="M ${n(x - 40 * k)} ${n(y)} L ${n(x - 48 * k)} ${n(y - 150 * k)} Q ${n(x)} ${n(y - 200 * k)} ${n(x + 48 * k)} ${n(y - 150 * k)} L ${n(x + 40 * k)} ${n(y)} Z" fill="${night("#E2B04A")}" ${ln(4)}/><ellipse cx="${n(x)}" cy="${n(y - 150 * k)}" rx="${n(26 * k)}" ry="${n(30 * k)}" fill="${night("#F2CF7A")}" ${ln(3)}/><path d="M ${n(x - 30 * k)} ${n(y - 100 * k)} L ${n(x + 30 * k)} ${n(y - 100 * k)} M ${n(x - 28 * k)} ${n(y - 70 * k)} L ${n(x + 28 * k)} ${n(y - 70 * k)}" stroke="#2F6FB5" stroke-width="${n(8 * k)}"/>`;
                    break;
                case "statue":
                    s += `<rect x="${n(x - 40 * k)}" y="${n(y - 50 * k)}" width="${n(80 * k)}" height="${n(50 * k)}" fill="${night("#B9B2C8")}" ${ln(4)}/><circle cx="${n(x)}" cy="${n(y - 150 * k)}" r="${n(30 * k)}" fill="${night("#CFC8DC")}" ${ln(4)}/><path d="M ${n(x - 34 * k)} ${n(y - 50 * k)} L ${n(x - 24 * k)} ${n(y - 120 * k)} L ${n(x + 24 * k)} ${n(y - 120 * k)} L ${n(x + 34 * k)} ${n(y - 50 * k)} Z" fill="${night("#CFC8DC")}" ${ln(4)}/>`;
                    break;
                case "pots":
                    s += `<path d="M ${n(x - 20 * k)} ${n(y - 70 * k)} L ${n(x + 20 * k)} ${n(y - 70 * k)} Q ${n(x + 50 * k)} ${n(y - 40 * k)} ${n(x + 26 * k)} ${n(y)} L ${n(x - 26 * k)} ${n(y)} Q ${n(x - 50 * k)} ${n(y - 40 * k)} ${n(x - 20 * k)} ${n(y - 70 * k)} Z" fill="${night("#C8673A")}" ${ln(4)}/><path d="M ${n(x - 34 * k)} ${n(y - 38 * k)} L ${n(x + 34 * k)} ${n(y - 38 * k)}" stroke="#F5D58A" stroke-width="${n(6 * k)}"/>`;
                    break;
                case "lab_bench":
                    s += `<rect x="${n(x - 90 * k)}" y="${n(y - 90 * k)}" width="${n(180 * k)}" height="${n(16 * k)}" fill="#9AA7B5" ${ln(4)}/><rect x="${n(x - 80 * k)}" y="${n(y - 74 * k)}" width="${n(160 * k)}" height="${n(74 * k)}" fill="#DDE3EA" ${ln(4)}/><path d="M ${n(x - 40 * k)} ${n(y - 130 * k)} L ${n(x - 40 * k)} ${n(y - 112 * k)} L ${n(x - 58 * k)} ${n(y - 90 * k)} L ${n(x - 22 * k)} ${n(y - 90 * k)} L ${n(x - 40 * k)} ${n(y - 112 * k)}" fill="#6CF2B0" ${ln(3)}/><rect x="${n(x + 10 * k)}" y="${n(y - 150 * k)}" width="${n(16 * k)}" height="${n(60 * k)}" rx="${n(8 * k)}" fill="#FF7E96" ${ln(3)}/>`;
                    break;
                case "telescope":
                    s += `<path d="M ${n(x)} ${n(y)} L ${n(x)} ${n(y - 90 * k)} M ${n(x - 30 * k)} ${n(y)} L ${n(x)} ${n(y - 90 * k)} L ${n(x + 30 * k)} ${n(y)}" fill="none" ${ln(6)}/><rect x="${n(x - 70 * k)}" y="${n(y - 120 * k)}" width="${n(140 * k)}" height="${n(30 * k)}" rx="${n(10 * k)}" fill="#3D6FD6" ${ln(4)} transform="rotate(${n(-fl * 24)} ${n(x)} ${n(y - 105 * k)})"/>`;
                    break;
                case "globe":
                    s += `<path d="M ${n(x)} ${n(y)} L ${n(x)} ${n(y - 60 * k)}" ${ln(8)}/><circle cx="${n(x)}" cy="${n(y - 100 * k)}" r="${n(42 * k)}" fill="#4F9BE0" ${ln(4)}/><path d="M ${n(x - 20 * k)} ${n(y - 120 * k)} q ${n(20 * k)} ${n(-10 * k)} ${n(30 * k)} ${n(10 * k)} q ${n(-10 * k)} ${n(20 * k)} ${n(-30 * k)} ${n(20 * k)} z" fill="#4DB35A"/>`;
                    break;
                case "bookshelf":
                    s += `<rect x="${n(x - 70 * k)}" y="${n(y - 220 * k)}" width="${n(140 * k)}" height="${n(220 * k)}" fill="${night("#9A6A3A")}" ${ln(4)}/>`;
                    for (let r2 = 0; r2 < 3; r2++)
                        for (let b = 0; b < 6; b++)
                            s += `<rect x="${n(x - 60 * k + b * 20 * k)}" y="${n(y - 210 * k + r2 * 70 * k)}" width="${n(16 * k)}" height="${n(56 * k)}" fill="${["#E8384A", "#3D6FD6", "#F5C542", "#3FAE6A"][(b + r2) % 4]}" ${ln(2)}/>`;
                    break;
                case "blackboard":
                    s += `<rect x="${n(x - 150 * k)}" y="${n(y - 260 * k)}" width="${n(300 * k)}" height="${n(150 * k)}" fill="#2F5A48" stroke="#9A6A3A" stroke-width="${n(14 * k)}"/><path d="M ${n(x - 110 * k)} ${n(y - 210 * k)} L ${n(x + 40 * k)} ${n(y - 210 * k)} M ${n(x - 110 * k)} ${n(y - 170 * k)} L ${n(x + 90 * k)} ${n(y - 170 * k)}" stroke="#FFFFFF" stroke-width="5" opacity="0.8"/>`;
                    break;
                case "crater":
                    s += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(120 * k)}" ry="${n(30 * k)}" fill="${mix(GROUND.moon, "#000000", 0.25)}" ${ln(4)}/>`;
                    break;
                case "flag":
                    s += `<path d="M ${n(x)} ${n(y)} L ${n(x)} ${n(y - 200 * k)}" ${ln(6)}/><path d="M ${n(x)} ${n(y - 200 * k)} L ${n(x + fl * 90 * k)} ${n(y - 190 * k + Math.sin(t * 3) * 6)} L ${n(x)} ${n(y - 150 * k)} Z" fill="${spec.palette.accent || "#FF9933"}" ${ln(3)}/>`;
                    break;
                case "campfire": {
                    const f = 1 + 0.15 * Math.sin(t * 12);
                    s += `<circle cx="${n(x)}" cy="${n(y - 30 * k)}" r="${n(110 * k)}" fill="#FFB347" opacity="0.18"/><path d="M ${n(x - 50 * k)} ${n(y)} L ${n(x + 50 * k)} ${n(y - 16 * k)} M ${n(x + 50 * k)} ${n(y)} L ${n(x - 50 * k)} ${n(y - 16 * k)}" stroke="#7A5234" stroke-width="${n(14 * k)}" stroke-linecap="round"/><path d="M ${n(x - 30 * k)} ${n(y - 10 * k)} Q ${n(x - 26 * k)} ${n(y - 70 * k * f)} ${n(x)} ${n(y - 100 * k * f)} Q ${n(x + 30 * k)} ${n(y - 60 * k * f)} ${n(x + 30 * k)} ${n(y - 10 * k)} Z" fill="#FF8C2A" ${ln(3)}/>`;
                    break;
                }
                case "boat":
                    s += `<path d="M ${n(x - 110 * k)} ${n(y - 40 * k)} L ${n(x + 110 * k)} ${n(y - 40 * k)} L ${n(x + 80 * k)} ${n(y)} L ${n(x - 80 * k)} ${n(y)} Z" fill="${night("#B5793A")}" ${ln(4)}/><path d="M ${n(x)} ${n(y - 40 * k)} L ${n(x)} ${n(y - 200 * k)} L ${n(x + fl * 80 * k)} ${n(y - 60 * k)} Z" fill="#FFF4E2" ${ln(4)}/>`;
                    break;
                case "well":
                    s += `<rect x="${n(x - 60 * k)}" y="${n(y - 70 * k)}" width="${n(120 * k)}" height="${n(70 * k)}" fill="${night("#B9A88A")}" ${ln(4)}/><path d="M ${n(x - 54 * k)} ${n(y - 70 * k)} L ${n(x - 54 * k)} ${n(y - 160 * k)} L ${n(x + 54 * k)} ${n(y - 160 * k)} L ${n(x + 54 * k)} ${n(y - 70 * k)}" fill="none" stroke="${night("#7A5234")}" stroke-width="${n(10 * k)}"/>`;
                    break;
                case "cart":
                    s += `<rect x="${n(x - 80 * k)}" y="${n(y - 90 * k)}" width="${n(160 * k)}" height="${n(50 * k)}" fill="${night("#C08A4A")}" ${ln(4)}/><circle cx="${n(x - 50 * k)}" cy="${n(y - 30 * k)}" r="${n(30 * k)}" fill="none" stroke="${night("#6B4430")}" stroke-width="${n(10 * k)}"/><circle cx="${n(x + 50 * k)}" cy="${n(y - 30 * k)}" r="${n(30 * k)}" fill="none" stroke="${night("#6B4430")}" stroke-width="${n(10 * k)}"/>`;
                    break;
                default:
                    break;
            }
        }
    });
    return s;
}

function drawWeather(spec, L, t) {
    const { width: W, height: H } = L;
    let s = "";
    const rand = createRandom(hashString(spec.id) ^ 77);
    if (spec.weather === "snow") {
        for (let i = 0; i < 70; i++) {
            const x0 = rand() * W * 1.4 - W * 0.2;
            const sp = 40 + rand() * 50;
            const y = ((rand() * H + t * sp) % (H * 1.1)) - H * 0.05;
            const x = x0 + Math.sin(t * 1.2 + i) * 14;
            s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(3 + rand() * 4)}" fill="#FFFFFF" opacity="0.85"/>`;
        }
    }
    if (spec.weather === "rain" || spec.weather === "storm") {
        for (let i = 0; i < 80; i++) {
            const x = rand() * W * 1.4 - W * 0.2;
            const y = ((rand() * H + t * 900) % (H * 1.1)) - H * 0.05;
            s += `<path d="M ${n(x)} ${n(y)} l -8 30" stroke="#CFE3FF" stroke-width="3" opacity="0.55"/>`;
        }
    }
    if (spec.weather === "fireball" || spec.weather === "smoke") {
        for (let i = 0; i < 26; i++) {
            const x = rand() * W * 1.4 - W * 0.2 + Math.sin(t + i) * 20;
            const y = H - ((rand() * H + t * (30 + rand() * 40)) % (H * 0.9));
            s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(2 + rand() * 3)}" fill="#FFB347" opacity="${n(0.4 + rand() * 0.4)}"/>`;
        }
    }
    if (spec.weather === "fog") {
        for (let k = 0; k < 3; k++) {
            const y = L.horizonY + H * (0.02 + k * 0.05);
            const x = ((t * (12 + k * 6)) % (W * 0.6)) - W * 0.3;
            s += `<ellipse cx="${n(x + W * 0.5)}" cy="${n(y)}" rx="${n(W * 0.7)}" ry="${n(H * 0.03)}" fill="#E6E8F2" opacity="0.22"/>`;
        }
    }
    return s;
}

/** Atmosphere tint on the whole back stack for dusk / night / smoke. */
function tint(spec, L) {
    const { width: W, height: H } = L;
    const c =
        spec.time === "night"
            ? ["#10123A", 0.22]
            : spec.time === "dusk"
              ? ["#3A1F5A", 0.12]
              : spec.weather === "smoke"
                ? ["#7A3A1A", 0.12]
                : null;
    if (!c || INTERIORS.has(spec.location) || spec.location === "space")
        return "";
    return `<rect x="${n(-W * 0.4)}" y="${n(-H * 0.4)}" width="${n(W * 1.8)}" height="${n(H * 1.8)}" fill="${c[0]}" opacity="${c[1]}"/>`;
}

/**
 * Parallax layers for a registered setting (same contract as
 * renderClassicLayers): { back: [{f, svg}], front: [{f, svg}], rim }.
 */
export function renderSettingLayers(spec, layout, stage = {}) {
    const t = stage.t || 0;
    const seed = hashString(spec.id) + spec.variant * 131;
    const r = (k) => createRandom(seed + k);
    const sky = drawSky(spec, layout, t, r(1));
    const far = drawFar(spec, layout, r(2));
    const mid = drawMid(spec, layout, t, r(3));
    const ground =
        drawGround(spec, layout, r(4)) + drawProps(spec, layout, t, r(5));
    const wx = drawWeather(spec, layout, t);
    const back = [
        { f: 0.04, svg: sky },
        { f: 0.25, svg: far + tint(spec, layout) },
        { f: 0.55, svg: mid },
        { f: 1, svg: ground },
    ];
    return {
        back,
        front: wx ? [{ f: 1.15, svg: wx }] : [],
        rim: spec.rim || (isDark(spec) ? "#C9D4FF" : null),
    };
}

/** Text the episode prompt shows the AI. */
export function settingPromptHelp() {
    return `SETTING (per part, the place where the part happens; must match the script):
"setting": {"preset": one of ${JSON.stringify(Object.keys(SETTING_PRESETS))}} OR a custom spec {"location": one of ${JSON.stringify(LOCATIONS)}, "era": "1908", "time": one of ${JSON.stringify(TIMES)}, "weather": one of ${JSON.stringify(WEATHERS)} ("fireball" = a blazing object in the sky), "props": up to 4 of ${JSON.stringify(SETTING_PROPS)}, "palette": {"skyTop": "#hex", "skyBottom": "#hex", "ground": "#hex", "accent": "#hex"} (optional)}.
Pick the setting from the script's real place and moment (e.g. a Siberian forest with fallen trees and a fireball in the sky, an Egyptian tomb, a Rajasthan fort at night, a lab, space). Different parts should usually be in different settings or at a different time.`;
}
