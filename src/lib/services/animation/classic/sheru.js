/**
 * Sheru, the gali's street dog (original design: tan coat, cream muzzle,
 * floppy brown ears, red cricket ball in his mouth). Drawn as a full figure
 * with legs so he can trot in and stand in the open; local coords face left
 * with the feet on y = 0 (see staging.js SHERU_LOCAL for the extent).
 */
import { OUT } from "./classicRig.js";

const n = (v) => Math.round(v * 100) / 100;
const COAT = "#C98A4E";
const COAT_DARK = "#A8703C";
const EAR = "#8A5A30";
const MUZZLE = "#F4E2C8";

function leg(x, top, swing, near) {
    // swing: radians around the hip; near legs are drawn lighter
    const L = 44;
    const fx = x + Math.sin(swing) * L;
    const fy = top + Math.cos(swing) * L;
    const c = near ? COAT : COAT_DARK;
    return (
        `<path d="M ${n(x)} ${n(top)} L ${n(fx)} ${n(fy)}" stroke="${OUT}" stroke-width="27" stroke-linecap="round"/>` +
        `<path d="M ${n(x)} ${n(top)} L ${n(fx)} ${n(fy)}" stroke="${c}" stroke-width="15" stroke-linecap="round"/>` +
        `<ellipse cx="${n(fx - 4)}" cy="${n(fy + 1)}" rx="15" ry="9" fill="${c}" stroke="${OUT}" stroke-width="5"/>`
    );
}

/** @param {{x,y,scale,facing,trot,trotAmt,squash,t}} s - from sheruAt() */
export function renderSheru(s) {
    const sx = s.scale * (s.facing < 0 ? 1 : -1);
    const sq = s.squash || 0;
    const t = s.t || 0;
    const st = `stroke="${OUT}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
    const a = (s.trot || 0) * Math.PI * 2;
    const amt = s.trotAmt || 0;
    const sw = (ph) => Math.sin(a + ph) * 0.55 * amt;
    const wag = Math.sin(t * (s.moving ? 22 : 14)) * 16;
    const breathe = s.moving ? 0 : Math.sin(t * 3.1) * 1.6;
    const bob = s.moving ? Math.abs(Math.sin(a)) * -4 * amt : 0;
    let g = `<g transform="translate(${n(s.x)} ${n(s.y)}) scale(${n(sx * (1 + sq))} ${n(s.scale * (1 - sq))})">`;
    // far legs (behind the body)
    g += leg(-34, -50, sw(Math.PI), false) + leg(52, -50, sw(0), false);
    g += `<g transform="translate(0 ${n(bob)})">`;
    // tail
    const tail = `M 72 -74 Q ${n(106 + wag)} -126 ${n(92 + wag)} -142`;
    g += `<path d="${tail}" fill="none" stroke="${OUT}" stroke-width="20" stroke-linecap="round"/><path d="${tail}" fill="none" stroke="${COAT}" stroke-width="9" stroke-linecap="round"/>`;
    // body
    g += `<ellipse cx="18" cy="${n(-76 - breathe)}" rx="${n(72 + breathe)}" ry="40" fill="${COAT}" ${st}/>`;
    g += `<ellipse cx="22" cy="${n(-62 - breathe)}" rx="40" ry="16" fill="${MUZZLE}" fill-opacity="0.55"/>`;
    // head
    g += `<circle cx="-52" cy="-120" r="50" fill="${COAT}" ${st}/>`;
    g += `<ellipse cx="-56" cy="-98" rx="31" ry="23" fill="${MUZZLE}" ${st}/>`;
    const ear = Math.sin(t * 2.3) * 3;
    g += `<path d="M -92 -152 Q ${n(-120 - ear)} -124 -101 -94 Q -87 -124 -79 -144 Z" fill="${EAR}" ${st}/>`;
    g += `<path d="M -16 -152 Q ${n(12 + ear)} -124 -6 -94 Q -20 -124 -26 -144 Z" fill="${EAR}" ${st}/>`;
    g += `<circle cx="-70" cy="-128" r="7" fill="${OUT}"/><circle cx="-34" cy="-128" r="7" fill="${OUT}"/><circle cx="-68" cy="-130" r="2.5" fill="#FFF"/><circle cx="-32" cy="-130" r="2.5" fill="#FFF"/>`;
    g += `<ellipse cx="-54" cy="-109" rx="10" ry="7" fill="${OUT}"/>`;
    // the "fielder": cricket ball in his mouth
    g += `<circle cx="-56" cy="-80" r="19" fill="#E8384A" ${st}/><path d="M -67 -90 Q -56 -80 -67 -70 M -45 -90 Q -56 -80 -45 -70" fill="none" stroke="#FFFFFF" stroke-width="3"/>`;
    g += "</g>";
    // near legs (in front of the body)
    g += leg(-14, -48, sw(0), true) + leg(70, -48, sw(Math.PI), true);
    g += "</g>";
    return g;
}
