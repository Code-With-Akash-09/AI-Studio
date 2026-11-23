/**
 * Random AI-style "character" scenes for the staging QA (rig-qa.mjs
 * --staging): random cast, background, poses, cameras, beats and actions
 * (including unsafe ones and out-of-range marks), like a sloppy model reply.
 */
export /** A random AI-style "character" scene (deterministic per seed). */
function fuzzScene(seed) {
    let st = (seed + 1) * 2654435761;
    const rnd = () => {
        st = (st * 1664525 + 1013904223) % 4294967296;
        return st / 4294967296;
    };
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const ids = ["Raazu", "Golu", "Kissa Nani"];
    const a = pick(ids);
    const b = pick(ids.filter((x) => x !== a));
    const exprs = [
        "neutral",
        "happy",
        "curious",
        "shocked",
        "scared",
        "smug",
        "sad",
    ];
    const poses = [
        "idle",
        "point",
        "think",
        "scared",
        "laugh",
        "shrug",
        "hips",
        "facefault",
        "scratch",
        "adjust",
        "action",
    ];
    const texts = [
        "अरे, ये तो कमाल हो गया!",
        "सुनो, इसके पीछे एक बहुत मज़ेदार विज्ञान छुपा है, ध्यान से सुनना।",
        "क्या सच में? मुझे तो डर लग रहा है!",
        "शेरू! तुम यहाँ क्या कर रहे हो?",
        "चलो, पास जाकर देखते हैं कि असल में क्या है।",
        "हा हा, गोलू फिर डर गया!",
        "नानी कहती थीं, हर रहस्य का एक जवाब होता है।",
    ];
    const marks = [
        "left",
        "center",
        "right",
        0.15,
        0.3,
        0.5,
        0.7,
        0.85,
        0.05,
        0.95,
    ];
    const nLines = 3 + Math.floor(rnd() * 6);
    const lines = [];
    for (let i = 0; i < nLines; i++) {
        const speaker = rnd() < 0.5 ? a : b;
        const other = speaker === a ? b : a;
        const actions = [];
        const nAct = Math.floor(rnd() * 3);
        for (let k = 0; k < nAct; k++) {
            const type = pick([
                "walk",
                "run",
                "hop",
                "hide",
                "doubletake",
                "dramatic",
                "jump",
            ]);
            const who = rnd() < 0.5 ? speaker : other;
            actions.push({
                who,
                type,
                to: type === "hide" ? (who === a ? b : a) : pick(marks),
                at: pick(["start", "end", undefined]),
            });
        }
        lines.push({
            speaker,
            text: pick(texts),
            expression: pick(exprs),
            pose: pick(poses),
            gesture: pick(["explain", "wave", "fist", "nod", undefined]),
            listener: { expression: pick(exprs), pose: pick(poses) },
            beat: pick([undefined, undefined, "humor", "reveal"]),
            reaction: {
                expression: "shocked",
                pose: pick(["idle", "facefault", "scared"]),
                text: "वाह!",
            },
            camera: pick([
                "wide",
                "wide",
                "speaker",
                "closeup",
                "reveal",
                undefined,
            ]),
            actions,
        });
    }
    return {
        id: 100 + seed,
        visualBrief: `fuzz ${seed}`,
        dialogue: {
            cast: [a, b],
            background: pick(["gali_day", "haveli_night", "plain"]),
            lines,
        },
    };
}
