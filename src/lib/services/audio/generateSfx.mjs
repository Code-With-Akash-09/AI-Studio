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

async function generateClick() {
    const duration = 0.08;
    const numSamples = Math.floor(SAMPLE_RATE * duration);
    const samples = [];

    for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE;
        const env = Math.exp(-60.0 * t);
        const freq = 1800.0 + 800.0 * Math.exp(-40.0 * t);
        const sine = Math.sin(2 * Math.PI * freq * t);
        const pop = (Math.random() * 2 - 1) * 0.3;
        samples.push((sine * 0.7 + pop) * env * 0.7);
    }

    const wavPath = path.join(OUT_DIR, "click.wav");
    const mp3Path = path.join(OUT_DIR, "click.mp3");
    writeWav(wavPath, samples);
    await convertToMp3(wavPath, mp3Path);
    console.log("Generated click.mp3");
}

async function generateGlitch() {
    const duration = 0.35;
    const numSamples = Math.floor(SAMPLE_RATE * duration);
    const samples = [];

    for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE;
        const step = Math.floor(t * 30);
        const freq = 300.0 + (step % 5) * 450.0;
        const noise = (Math.random() * 2 - 1) * 0.5;
        const tone = Math.sin(2 * Math.PI * freq * t) * 0.5;
        const env = (1 - t / duration) ** 1.5;
        samples.push((tone + noise) * env * 0.5);
    }

    const wavPath = path.join(OUT_DIR, "glitch.wav");
    const mp3Path = path.join(OUT_DIR, "glitch.mp3");
    writeWav(wavPath, samples);
    await convertToMp3(wavPath, mp3Path);
    console.log("Generated glitch.mp3");
}

async function generateChime() {
    const duration = 0.8;
    const numSamples = Math.floor(SAMPLE_RATE * duration);
    const samples = [];

    for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE;
        const env = Math.exp(-5.0 * t);
        const s1 = Math.sin(2 * Math.PI * 1046.5 * t); // C6
        const s2 = Math.sin(2 * Math.PI * 1318.5 * t) * 0.7; // E6
        const s3 = Math.sin(2 * Math.PI * 1567.98 * t) * 0.5; // G6
        samples.push((s1 + s2 + s3) * env * 0.35);
    }

    const wavPath = path.join(OUT_DIR, "chime.wav");
    const mp3Path = path.join(OUT_DIR, "chime.mp3");
    writeWav(wavPath, samples);
    await convertToMp3(wavPath, mp3Path);
    console.log("Generated chime.mp3");
}

async function generateAmbientWind() {
    const duration = 12.0;
    const numSamples = Math.floor(SAMPLE_RATE * duration);
    const samples = [];

    for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE;
        const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.25 * t);
        const noise = (Math.random() * 2 - 1) * 0.25;
        const lowRumble = Math.sin(2 * Math.PI * 65.0 * t) * 0.15;
        samples.push((noise * lfo + lowRumble) * 0.4);
    }

    const wavPath = path.join(OUT_DIR, "ambient_wind.wav");
    const mp3Path = path.join(OUT_DIR, "ambient_wind.mp3");
    writeWav(wavPath, samples);
    await convertToMp3(wavPath, mp3Path);
    console.log("Generated ambient_wind.mp3");
}

async function generateAmbientCyber() {
    const duration = 12.0;
    const numSamples = Math.floor(SAMPLE_RATE * duration);
    const samples = [];

    for (let i = 0; i < numSamples; i++) {
        const t = i / SAMPLE_RATE;
        const drone = Math.sin(2 * Math.PI * 55.0 * t) * 0.3; // A1
        const fifth = Math.sin(2 * Math.PI * 82.5 * t) * 0.15;
        const pulse = Math.sin(2 * Math.PI * 110.0 * t) * (0.05 + 0.05 * Math.sin(2 * Math.PI * 1.5 * t));
        samples.push((drone + fifth + pulse) * 0.35);
    }

    const wavPath = path.join(OUT_DIR, "ambient_cyber.wav");
    const mp3Path = path.join(OUT_DIR, "ambient_cyber.mp3");
    writeWav(wavPath, samples);
    await convertToMp3(wavPath, mp3Path);
    console.log("Generated ambient_cyber.mp3");
}

async function main() {
    await generateWhoosh();
    await generateImpact();
    await generateRiser();
    await generateClick();
    await generateGlitch();
    await generateChime();
    await generateAmbientWind();
    await generateAmbientCyber();
    console.log("All cinematic SFX & Foley audio files generated successfully.");
}

main().catch(console.error);
