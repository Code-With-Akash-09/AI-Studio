/**
 * Raaz Explain Tv — original recurring cast.
 *
 * All characters here are ORIGINAL designs for the channel. They are simple,
 * flat 2D rigs (bold outlines, big expressive eyes / mouths) drawn in code by
 * rig.js. Do not add, trace, or rename characters after any other channel's cast.
 *
 * `rig` holds the parametric look consumed by rig.js; everything else is the
 * writer's bible (personality, speech style, catchphrases, voice).
 */

export const CHARACTERS = {
    raazu: {
        id: "raazu",
        name: "Raazu",
        nameHi: "राज़ू",
        role: "lead",
        archetype: "Curious narrator-detective (host)",
        oneLiner:
            "The channel's host: a lanky, bespectacled know-it-all-in-training who can't walk past a mystery without poking it with a magnifying glass.",
        personality: [
            "Endlessly curious, asks 'kyun?' about everything",
            "Calm under pressure, deadpan when Golu panics",
            "Explains like a friend, not a teacher; loves a dramatic pause before the reveal",
            "Rational: always lands on evidence, never confirms ghosts",
        ],
        speechStyle:
            "Conversational Hindustani with light English words ('logic', 'scene', 'clue'); addresses viewers as 'doston'; short sentences, builds suspense with '...ruko', then a crisp reveal line.",
        catchphrases: [
            {
                hi: "राज़ जितना गहरा, सच उतना मज़ेदार!",
                roman: "Raaz jitna gehra, sach utna mazedaar!",
            },
            {
                hi: "चलो, परत-दर-परत खोलते हैं।",
                roman: "Chalo, parat-dar-parat kholte hain.",
            },
            {
                hi: "सबूत बोलता है, अफ़वाह नहीं।",
                roman: "Saboot bolta hai, afwaah nahin.",
            },
            {
                hi: "रुको... यहीं तो असली खेल है!",
                roman: "Ruko... yahin toh asli khel hai!",
            },
        ],
        voice: {
            engine: "edge-tts",
            name: "hi-IN-MadhurNeural",
            rate: "+12%",
            pitch: "-4Hz",
            notes: "Warm, steady male voice; slightly lower pitch so he sounds like the anchor. Speed +12% keeps explanations brisk.",
        },
        palette: {
            skin: "#C98B5E",
            hair: "#2B1B17",
            outfit: "#1F6F78",
            accent: "#F2B33D",
            pants: "#34405A",
            shoes: "#3A2A22",
            outline: "#1A1A22",
            caption: "#F2B33D",
        },
        visualSpec:
            "Tall and lanky; teal detective coat with mustard scarf; round black glasses; messy hair with one signature cowlick; carries a brass magnifying glass when pointing.",
        rig: {
            height: 640,
            headR: 118,
            torsoTopW: 150,
            torsoBottomW: 176,
            torsoH: 205,
            legH: 150,
            eyeScale: 1,
            hair: "messy",
            glasses: true,
            scarf: true,
            blush: false,
            prop: "magnifier",
        },
        anime: {
            hairStyle: "spiky",
            hair: "#2A2350",
            hairHighlight: "#6A5FB8",
            iris: "#2FB3A8",
            irisDark: "#0E4A52",
            line: "#1B1530",
            innerShirt: "#F3EBDD",
            coatLength: 0.62,
            glasses: "round",
        },
        /** Classic kids-TV chibi look (classic/classicRig.js). Original colours/props. */
        classic: {
            headR: 128,
            bodyW: 150,
            bodyH: 136,
            legH: 64,
            body: "coat",
            // v8 look = the thumbnail design: neat dark-brown hair with one
            // curl, round thin glasses, closed teal coat + mustard scarf
            hair: "neat",
            iris: "#3B2618",
            hairColor: "#2B1D17",
            skin: "#D99A66",
            outfit: "#1C8C8E",
            outfitDark: "#136668",
            shirt: "#FFF4E2",
            accent: "#F2B233",
            pants: "#3D4A7C",
            shoes: "#80502F",
            eyes: "oval",
            nose: "curve",
            glasses: "round",
            glassesColor: "#2A2233",
            prop: "magnifier",
        },
    },

    golu: {
        id: "golu",
        name: "Golu",
        nameHi: "गोलू",
        role: "lead",
        archetype: "Scared comic sidekick",
        oneLiner:
            "Raazu's round, snack-loving best friend who is terrified of everything spooky but refuses to admit it — the channel's humor engine.",
        personality: [
            "Scared of ghosts, dark rooms, owls, and his mother's chappal (in that order)",
            "Makes up excuses to run away, then claims he was never scared",
            "Asks the 'dumb' question the audience is secretly thinking",
            "Loyal: always comes back for Raazu",
        ],
        speechStyle:
            "Fast, high-pitched, dramatic; lots of 'bhai', 'arre', 'mummy kasam'; repeats words when nervous ('hai na? hai na?!'); punchlines are excuses or food references.",
        catchphrases: [
            {
                hi: "भाई, मैं डरा नहीं हूँ... बस काँप रहा हूँ!",
                roman: "Bhai, main dara nahin hoon... bas kaanp raha hoon!",
            },
            {
                hi: "मम्मी क़सम, अब मैं घर जा रहा हूँ!",
                roman: "Mummy kasam, ab main ghar ja raha hoon!",
            },
            {
                hi: "भूत-वूत कुछ नहीं होता... है ना? है ना?!",
                roman: "Bhoot-voot kuch nahin hota... hai na? Hai na?!",
            },
            {
                hi: "पहले समोसा, फिर सस्पेंस।",
                roman: "Pehle samosa, phir suspense.",
            },
        ],
        voice: {
            engine: "edge-tts",
            name: "hi-IN-MadhurNeural",
            rate: "+20%",
            pitch: "+28Hz",
            notes: "Same Hindi male voice pushed higher and faster for a nervous, comic register. Only two Hindi Edge voices exist (Madhur, Swara) — see report for alternatives.",
        },
        palette: {
            skin: "#E0A47A",
            hair: "#1E1410",
            outfit: "#F07C2C",
            accent: "#D6312E",
            pants: "#3E8A5A",
            shoes: "#5B3A29",
            outline: "#1A1A22",
            caption: "#FF9A4D",
        },
        visualSpec:
            "Short and round; bright orange kurta with a red checked gamchha around the neck; big round cheeks with blush; single hair tuft on top; extra-large eyes that shrink to dots when scared; sweat drops on cue.",
        rig: {
            height: 560,
            headR: 122,
            torsoTopW: 170,
            torsoBottomW: 230,
            torsoH: 175,
            legH: 105,
            eyeScale: 1.12,
            hair: "tuft",
            glasses: false,
            scarf: true,
            blush: true,
            prop: null,
        },
        anime: {
            hairStyle: "tuft",
            hair: "#2B1A12",
            hairHighlight: "#8A5636",
            iris: "#B8742E",
            irisDark: "#4A2810",
            line: "#2A1812",
            innerShirt: "#FFE3B8",
            coatLength: 0,
            glasses: null,
        },
        classic: {
            headR: 136,
            bodyW: 176,
            bodyH: 118,
            legH: 48,
            body: "round",
            hair: "swirl",
            iris: "#4A2A16",
            gamchha: "#D9312F",
            hairColor: "#2A1A14",
            skin: "#F0B486",
            outfit: "#F57F20",
            outfitDark: "#CC5F10",
            shirt: "#FFF0D2",
            accent: "#E8384A",
            pants: "#3FAE6A",
            shoes: "#8A5532",
            eyes: "round",
            nose: "button",
            glasses: null,
            prop: null,
        },
    },

    // Optional secondary character (not required for v1 episodes).
    nani: {
        id: "nani",
        name: "Kissa Nani",
        nameHi: "क़िस्सा नानी",
        role: "secondary",
        archetype: "Elder who knows the old legends",
        oneLiner:
            "The mohalla's storyteller grandmother: tells the spooky legend first, then winks because she always knew the real explanation.",
        personality: [
            "Warm, unhurried, mischievous",
            "Knows every local legend and who started the rumour",
            "Teases Golu, respects Raazu's logic",
        ],
        speechStyle:
            "Slow, rhythmic Hindi with old-fashioned words ('beta', 'zamaana', 'kehte hain'); ends stories with a playful question.",
        catchphrases: [
            {
                hi: "बेटा, हर क़िस्से के पीछे एक सच छुपा होता है।",
                roman: "Beta, har kisse ke peeche ek sach chhupa hota hai.",
            },
            {
                hi: "हमारे ज़माने में तो...",
                roman: "Humare zamaane mein toh...",
            },
        ],
        voice: {
            engine: "edge-tts",
            name: "hi-IN-SwaraNeural",
            rate: "-12%",
            pitch: "-18Hz",
            notes: "Female Hindi voice slowed and lowered for an elder storyteller.",
        },
        palette: {
            skin: "#B97A50",
            hair: "#E6E1DA",
            outfit: "#6B3FA0",
            accent: "#E8C547",
            pants: "#4A2D73",
            shoes: "#3A2A22",
            outline: "#1A1A22",
            caption: "#C9A2FF",
        },
        visualSpec:
            "Small and slightly hunched; purple saree with a gold border; white hair in a bun; tiny round spectacles on her nose; smile lines.",
        rig: {
            height: 540,
            headR: 108,
            torsoTopW: 150,
            torsoBottomW: 210,
            torsoH: 190,
            legH: 90,
            eyeScale: 0.92,
            hair: "bun",
            iris: "#7A5230",
            glasses: true,
            scarf: false,
            blush: true,
            prop: null,
            saree: true,
        },
        anime: {
            hairStyle: "bun",
            hair: "#E9E4F0",
            hairHighlight: "#FFFFFF",
            iris: "#7A5230",
            irisDark: "#3A2210",
            line: "#2A1830",
            innerShirt: "#E8C547",
            coatLength: 0,
            glasses: "small",
        },
        classic: {
            headR: 118,
            bodyW: 164,
            bodyH: 150,
            legH: 26,
            body: "saree",
            hair: "bun",
            hairColor: "#F4F1EC",
            skin: "#CF9468",
            outfit: "#9A5ED6",
            outfitDark: "#7440AE",
            shirt: "#FFE07A",
            accent: "#FFC233",
            pants: "#7440AE",
            shoes: "#6B4430",
            eyes: "oval",
            nose: "curve",
            glasses: "small",
            glassesColor: "#7A5A2A",
            prop: null,
        },
    },
};

export const LEAD_CHARACTER_IDS = ["raazu", "golu"];

export function getCharacter(id) {
    const character = CHARACTERS[String(id || "").toLowerCase()];
    if (!character) {
        throw new Error(`Unknown animation character: ${id}`);
    }
    return character;
}
