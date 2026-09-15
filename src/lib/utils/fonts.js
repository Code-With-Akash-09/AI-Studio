import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FONTS_DIR = path.resolve(process.cwd(), "src/lib/assets/fonts");

/**
 * Detects the script used in text and returns the optimal bilingual font file.
 * Defaults to Mukta-Bold.ttf because it natively contains BOTH complete Latin
 * (English letters, numbers, punctuation) AND complete Devanagari (Hindi, Marathi, etc.).
 *
 * @param {string} [text=""] - Text to inspect
 * @param {string} [language=""] - Optional language hint
 * @returns {string} Font file name
 */
export function getFontFileName(text = "", language = "") {
    const str = String(text || "");
    const lang = String(language || "")
        .toLowerCase()
        .split("-")[0]
        .trim();

    // 1. Devanagari & Hinglish (Hindi, Marathi, Nepali, Mixed English-Hindi)
    if (
        /[\u0900-\u097F]/.test(str) ||
        lang === "hi" ||
        lang === "mr" ||
        lang === "ne"
    ) {
        return "Mukta-Bold.ttf";
    }

    // 2. Gujarati & English
    if (/[\u0A80-\u0AFF]/.test(str) || lang === "gu") {
        return "MuktaVaani-Bold.ttf";
    }

    // 3. Tamil & English
    if (/[\u0B80-\u0BFF]/.test(str) || lang === "ta") {
        return "NotoSansTamil-Bold.ttf";
    }

    // 4. Telugu & English
    if (/[\u0C00-\u0C7F]/.test(str) || lang === "te") {
        return "NotoSansTelugu-Bold.ttf";
    }

    // 5. Bengali & English
    if (/[\u0980-\u09FF]/.test(str) || lang === "bn") {
        return "NotoSansBengali-Bold.ttf";
    }

    // 6. Arabic & Urdu
    if (/[\u0600-\u06FF]/.test(str) || lang === "ur" || lang === "ar") {
        return "NotoSansArabic-Bold.ttf";
    }

    // 7. Default to Mukta-Bold.ttf (covers both English & Hindi/Devanagari flawlessly)
    return "Mukta-Bold.ttf";
}

/**
 * Returns the absolute path to a Unicode font file matching the text & language.
 *
 * @param {string} [text=""] - Text or language hint
 * @param {string} [language=""] - Language code
 * @returns {string} Safe absolute path to font file for FFmpeg
 */
export function getFontPath(text = "", language = "") {
    const fontFileName = getFontFileName(text, language);
    const fontPath = path.join(FONTS_DIR, fontFileName);

    if (fs.existsSync(fontPath)) {
        return fontPath;
    }

    // Fallbacks
    const mukta = path.join(FONTS_DIR, "Mukta-Bold.ttf");
    if (fs.existsSync(mukta)) {
        return mukta;
    }

    const poppins = path.join(FONTS_DIR, "Poppins-Bold.ttf");
    if (fs.existsSync(poppins)) {
        return poppins;
    }

    const defaultLatin = path.join(FONTS_DIR, "NotoSans-Bold.ttf");
    if (fs.existsSync(defaultLatin)) {
        return defaultLatin;
    }

    return "";
}
