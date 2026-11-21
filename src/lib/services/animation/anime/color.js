/** Tiny colour helpers for cel shading (pure). */

function parse(hex) {
    const h = hex.replace("#", "");
    return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
}

function toHex(rgb) {
    return `#${rgb
        .map((v) =>
            Math.round(Math.max(0, Math.min(255, v)))
                .toString(16)
                .padStart(2, "0"),
        )
        .join("")}`;
}

export function mix(a, b, t) {
    const x = parse(a);
    const y = parse(b);
    return toHex(x.map((v, i) => v + (y[i] - v) * t));
}

/** Cool, slightly violet shadow tone (night-lit anime look). */
export function shadowOf(hex, amount = 0.34) {
    return mix(hex, "#2A1F5A", amount);
}

export function lightOf(hex, amount = 0.35) {
    return mix(hex, "#FFFFFF", amount);
}
