import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runFFmpeg } from "../../utils/ffmpeg.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.resolve(__dirname, "../../../assets/audio/sfx");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const SAMPLE_RATE = 44100;

function writeWav(filename, samples) {
    const buffer = Buffer.alloc(44 + samples.length * 2);
    // RIFF chunk descriptor
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + samples.length * 2, 4);
    buffer.write("WAVE", 8);
    // fmt sub-chunk
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16); // subchunk1size (16 for PCM)
    buffer.writeUInt16LE(1, 20); // audioFormat 1 = PCM
    buffer.writeUInt16LE(1, 22); // numChannels = 1
    buffer.writeUInt32LE(SAMPLE_RATE, 24); // sampleRate
    buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byteRate
    buffer.writeUInt16LE(2, 32); // blockAlign
    buffer.writeUInt16LE(16, 34); // bitsPerSample
    // data sub-chunk
    buffer.write("data", 36);
    buffer.writeUInt32LE(samples.length * 2, 40);

    for (let i = 0; i < samples.length; i++) {
        const val = Math.max(
            -32767,
            Math.min(32767, Math.round(samples[i] * 32767)),
        );
        buffer.writeInt16LE(val, 44 + i * 2);
    }
    fs.writeFileSync(filename, buffer);
}

async function convertToMp3(wavPath, mp3Path) {
    await runFFmpeg(["-y", "-i", wavPath, "-b:a", "192k", mp3Path]);
    if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
}

async function generateWhoosh() {
    const duration = 0.55;
    const numSamples = Math.floor(SAMPLE_RATE * duration);
    const samples = [];

    for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE;
        const progress = t / duration;
        const envelope = Math.sin(progress * Math.PI) ** 2.2;
        const centerFreq = 250.0 + 1100.0 * Math.sin(progress * Math.PI);
        const sine1 = Math.sin(2 * Math.PI * centerFreq * t);
        const sine2 = Math.sin(2 * Math.PI * (centerFreq * 1.5) * t) * 0.4;
        const noise = (Math.random() * 2 - 1) * 0.35;
        samples.push((sine1 + sine2 + noise) * envelope * 0.65);
    }

    const wavPath = path.join(OUT_DIR, "whoosh.wav");
    const mp3Path = path.join(OUT_DIR, "whoosh.mp3");
    writeWav(wavPath, samples);
    await convertToMp3(wavPath, mp3Path);
    console.log("Generated whoosh.mp3");
}

async function generateImpact() {
    const duration = 0.9;
    const numSamples = Math.floor(SAMPLE_RATE * duration);
    const samples = [];

    for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE;
        const env = Math.exp(-4.5 * t);
        const pitch = 45.0 + 130.0 * Math.exp(-12.0 * t);
        const subBass = Math.sin(2 * Math.PI * pitch * t);
        const noiseBurst = (Math.random() * 2 - 1) * Math.exp(-22.0 * t) * 0.45;
        samples.push((subBass * 0.8 + noiseBurst) * env);
    }

    const wavPath = path.join(OUT_DIR, "impact.wav");
    const mp3Path = path.join(OUT_DIR, "impact.mp3");
    writeWav(wavPath, samples);
    await convertToMp3(wavPath, mp3Path);
    console.log("Generated impact.mp3");
}

async function generateRiser() {
    const duration = 1.1;
    const numSamples = Math.floor(SAMPLE_RATE * duration);
    const samples = [];

    for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE;
        const progress = t / duration;
        const env = progress ** 1.8;
        const freq = 120.0 + 500.0 * progress ** 2;
        const sine = Math.sin(2 * Math.PI * freq * t);
        const sine2 = Math.sin(2 * Math.PI * (freq * 2.01) * t) * 0.35;
        samples.push((sine + sine2) * env * 0.6);
    }

    const wavPath = path.join(OUT_DIR, "riser.wav");
    const mp3Path = path.join(OUT_DIR, "riser.mp3");
    writeWav(wavPath, samples);
    await convertToMp3(wavPath, mp3Path);
    console.log("Generated riser.mp3");
}

async function main() {
    await generateWhoosh();
    await generateImpact();
    await generateRiser();
    console.log("All cinematic SFX audio files generated successfully.");
}

main().catch(console.error);
