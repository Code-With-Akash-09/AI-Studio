/**
 * Quick look check: hosts in the thumbnail poses on a flat backdrop.
 *   node .scripts/animation/look-test.mjs out.png [W H]
 */
import fs from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { CHARACTERS } from "../../src/lib/services/animation/characters.js";
import { renderClassicCharacter } from "../../src/lib/services/animation/classic/classicRig.js";

const out = process.argv[2] || "/tmp/look.png";
const W = Number(process.argv[3] || 1600);
const H = Number(process.argv[4] || 900);
const cast = [
    [
        CHARACTERS.golu,
        { expression: "shocked", pose: "scared", facing: 1, since: 2 },
    ],
    [
        CHARACTERS.raazu,
        {
            expression: "suspicious",
            pose: "point",
            facing: -1,
            look: [-0.6, 0],
        },
    ],
    [
        CHARACTERS.raazu,
        {
            expression: "happy",
            pose: "explain",
            facing: 1,
            talking: true,
            mouth: "A",
            level: 0.8,
        },
    ],
    [CHARACTERS.golu, { expression: "laughing", pose: "laugh", facing: -1 }],
];
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#3B3566"/>`;
cast.forEach(([ch, st], i) => {
    svg += renderClassicCharacter(ch, {
        x: (W / 4) * (i + 0.5),
        y: H - 60,
        scale: (H / 900) * 1.05,
        t: 1.3,
        uid: `k${i}`,
        ...st,
    });
});
svg += "</svg>";
fs.writeFileSync(out, new Resvg(svg).render().asPng());
console.log(out);
