/**
 * ASS captions for animated dialogue: speaker-coloured subtitles, comic
 * reaction pop-ups and a small channel watermark. Rendered by ffmpeg/libass
 * with the repo's bundled Mukta font (Devanagari + Latin).
 */
import { frameState } from "./timeline.js";

function assTime(seconds) {
    const s = Math.max(0, seconds);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const cs = Math.floor((s % 1) * 100);
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function escapeText(text) {
    return String(text || "")
        .replace(/\\/g, "\\\\")
        .replace(/\{/g, "\\{")
        .replace(/\}/g, "\\}")
        .replace(/\r?\n/g, "\\N");
}

/** "#RRGGBB" → ASS "&H00BBGGRR" */
function assColor(hex) {
    const h = hex.replace("#", "");
    return `&H00${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase();
}

function toScreen(point, frame, layout) {
    const { camera } = frame;
    return [
        (point[0] - camera.x) * camera.s + layout.width / 2,
        (point[1] - camera.y) * camera.s + layout.height / 2,
    ];
}

/**
 * @param {object} timeline - from buildTimeline
 * @returns {{ ass: string, captions: Array<{speaker:string,text:string,start:number,end:number}> }}
 */
export function buildDialogueAss(timeline) {
    const { layout, events, actors, dialogue } = timeline;
    const W = layout.width;
    const H = layout.height;
    const vertical = layout.vertical;
    const fontSize = vertical ? 58 : 52;
    const popSize = vertical ? 92 : 86;
    const marginV = vertical ? Math.round(H * 0.12) : 34;

    const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Line,Mukta,${fontSize},&H00FFFFFF,&H000000FF,&H00140E10,&H96000000,1,0,0,0,100,100,0,0,1,5,2,2,${vertical ? 60 : 160},${vertical ? 60 : 160},${marginV},1
Style: Pop,Mukta,${popSize},&H0030E6FF,&H000000FF,&H00140E10,&H96000000,1,0,0,0,100,100,0,-6,1,7,3,5,20,20,20,1
Style: Mark,Mukta,${vertical ? 34 : 30},&H00FFFFFF,&H000000FF,&H00140E10,&H96000000,1,0,0,0,100,100,1,0,1,3,0,9,30,30,24,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

    const lines = [];
    const captions = [];

    if (dialogue.watermark) {
        lines.push(
            `Dialogue: 2,${assTime(0)},${assTime(timeline.duration)},Mark,,0,0,0,,{\\alpha&H40&}${escapeText(dialogue.watermark)}`,
        );
    }

    for (const ev of events) {
        const ch = actors[ev.speaker].character;
        const color = assColor(ch.palette.caption || "#FFFFFF");
        const end = Math.min(ev.nextStart, ev.end + 0.35);
        const text = `{\\c${color}}${escapeText(ch.nameHi)}:{\\c&H00FFFFFF&} ${escapeText(ev.text)}`;
        lines.push(
            `Dialogue: 1,${assTime(ev.start)},${assTime(end)},Line,,0,0,0,,${text}`,
        );
        captions.push({
            speaker: ev.speaker,
            text: ev.text,
            start: ev.start,
            end,
        });

        if (ev.reaction?.text) {
            const listener = actors[ev.listenerId];
            const frame = frameState(timeline, ev.reactionStart + 0.05, 0);
            const [x, y] = toScreen(
                [listener.x, listener.headY - layout.height * 0.14],
                frame,
                layout,
            );
            const px = Math.round(Math.min(W - 160, Math.max(160, x)));
            const py = Math.round(Math.min(H * 0.6, Math.max(90, y)));
            const fx = `{\\pos(${px},${py})\\fscx20\\fscy20\\frz-8\\t(0,180,\\fscx118\\fscy118)\\t(180,320,\\fscx100\\fscy100)\\fad(0,200)}`;
            lines.push(
                `Dialogue: 3,${assTime(ev.reactionStart)},${assTime(ev.reactionEnd)},Pop,,0,0,0,,${fx}${escapeText(ev.reaction.text)}`,
            );
        }
    }

    return { ass: `${header}\n${lines.join("\n")}\n`, captions };
}
