/**
 * The hand-written "AI result" used by seed-pipeline-test.mjs and rig-qa.mjs
 * (same JSON shape analyzeScript returns in character mode): a stock scene,
 * a character dialogue scene (Golu hides behind Raazu, an unsafe jump that
 * must be stripped, Sheru mentioned mid-scene) and a text punchline.
 */
export const script =
    "क्या आप जानते हैं कि उल्लू अपना सिर लगभग पूरा पीछे घुमा सकता है? रात को गोलू ने ये देखा तो उसे लगा कि ये कोई भूत है, लेकिन राज़ू ने उसे समझाया कि उल्लू की गर्दन में चौदह हड्डियाँ होती हैं, इसलिए वो इतना घूम पाता है। यानी ये भूत नहीं, विज्ञान है!";

// What the AI returns in character mode (same JSON shape as analyzeScript).
export const aiResult = {
    detectedLanguage: "hi",
    narrativeTopic: "Owl neck rotation",
    storylineMood: "humorous",
    scenes: [
        {
            id: 1,
            narration: "क्या आप जानते हैं कि उल्लू अपना सिर लगभग पूरा पीछे घुमा सकता है?",
            visualBrief: "Close-up of an owl turning its head far around",
            subject: "owl",
            environment: "tree branch at dusk",
            action: "owl rotates its head",
            cameraShot: "close_up",
            lightingMood: "golden_hour",
            emotion: "curious",
            visualType: "video",
            searchQueries: ["owl turning head", "owl close up", "owl"],
            negativeKeywords: ["cartoon", "toy"],
            onScreenHighlight: "270°",
            punchline: false,
        },
        {
            id: 2,
            narration:
                "रात को गोलू ने ये देखा तो उसे लगा कि ये कोई भूत है, लेकिन राज़ू ने उसे समझाया कि उल्लू की गर्दन में चौदह हड्डियाँ होती हैं, इसलिए वो इतना घूम पाता है।",
            visualBrief: "Two kids talking about an owl at night",
            subject: "owl",
            environment: "old haveli at night",
            action: "kids discussing",
            cameraShot: "medium_shot",
            lightingMood: "dark_mysterious",
            emotion: "humorous",
            visualType: "character",
            searchQueries: ["owl at night", "owl eyes night"],
            negativeKeywords: ["cartoon"],
            onScreenHighlight: "14 हड्डियाँ",
            punchline: false,
            dialogue: {
                cast: ["Raazu", "Golu"],
                background: "haveli_night",
                lines: [
                    {
                        speaker: "Golu",
                        text: "राज़ू! उस उल्लू ने अपना सिर पूरा पीछे घुमा लिया, ये ज़रूर भूत है!",
                        expression: "scared",
                        pose: "scared",
                        listener: { expression: "curious", pose: "think" },
                        camera: "wide",
                        actions: [{ who: "golu", type: "hide", to: "raazu" }],
                    },
                    {
                        speaker: "Raazu",
                        text: "भूत नहीं गोलू, उल्लू की गर्दन में चौदह हड्डियाँ होती हैं।",
                        expression: "happy",
                        pose: "idle",
                        gesture: "explain",
                        listener: { expression: "scared", pose: "scared" },
                        camera: "wide",
                    },
                    {
                        speaker: "Raazu",
                        text: "इसीलिए वो अपना सिर इतना घुमा पाता है!",
                        expression: "happy",
                        pose: "point",
                        listener: { expression: "shocked", pose: "idle" },
                        beat: "humor",
                        reaction: {
                            expression: "shocked",
                            pose: "idle",
                            text: "वाह!",
                        },
                        camera: "wide",
                        // unsafe action on purpose: must be stripped
                        actions: [{ who: "golu", type: "jump", to: "raazu" }],
                    },
                    {
                        // Sheru mentioned mid-scene: must trot in, fully visible
                        speaker: "Golu",
                        text: "अरे, शेरू भी उल्लू देखने आ गया!",
                        expression: "happy",
                        pose: "point",
                        listener: { expression: "happy", pose: "idle" },
                        camera: "wide",
                    },
                ],
            },
        },
        {
            id: 3,
            narration: "यानी ये भूत नहीं, विज्ञान है!",
            visualBrief: "Bold text: science, not a ghost",
            subject: "text",
            environment: "",
            action: "",
            cameraShot: "medium_shot",
            lightingMood: "bright_natural",
            emotion: "humorous",
            visualType: "text",
            searchQueries: ["science"],
            negativeKeywords: [],
            onScreenHighlight: "विज्ञान!",
            punchline: true,
        },
    ],
};
