"""
Generate 100% original, copyright-safe, loopable background music tracks
for AI Video Studio storylines using acoustic wave synthesis and FFmpeg processing.
"""
import os
import math
import struct
import wave
import subprocess

SAMPLE_RATE = 44100
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../assets/audio/bgm"))
os.makedirs(OUT_DIR, exist_ok=True)

def note_freq(semitones_from_a4):
    return 440.0 * (2.0 ** (semitones_from_a4 / 12.0))

# Note semitones from A4 (A4 = 0)
# C4 = -9, D4 = -7, E4 = -5, F4 = -4, G4 = -2, A4 = 0, B4 = 2, C5 = 3
NOTES = {
    'C3': -21, 'D3': -19, 'E3': -17, 'F3': -16, 'G3': -14, 'A3': -12, 'B3': -10,
    'C4': -9,  'D4': -7,  'E4': -5,  'F4': -4,  'G4': -2,  'A4': 0,   'B4': 2,
    'C5': 3,   'D5': 5,   'E5': 7,   'F5': 8,   'G5': 10,  'A5': 12,  'B5': 14,
    'E2': -29, 'A2': -24, 'F2': -28, 'G2': -26, 'D2': -31, 'B2': -22,
}

def generate_track(name, chords, tempo_bpm=100, mood='ambient', duration_beats=32):
    beat_sec = 60.0 / tempo_bpm
    total_duration = duration_beats * beat_sec
    num_samples = int(SAMPLE_RATE * total_duration)
    samples = [0.0] * num_samples

    beats_per_chord = duration_beats // len(chords)
    chord_duration = beats_per_chord * beat_sec

    for c_idx, chord in enumerate(chords):
        c_start = c_idx * chord_duration
        c_start_sample = int(c_start * SAMPLE_RATE)
        c_samples = int(chord_duration * SAMPLE_RATE)

        # Add chord pad notes
        for note_name in chord:
            freq = note_freq(NOTES.get(note_name, -9))

            for i in range(c_samples):
                idx = c_start_sample + i
                if idx >= num_samples:
                    break
                t = i / SAMPLE_RATE
                t_global = idx / SAMPLE_RATE

                # Smooth envelope (ADSR)
                env = 1.0
                attack = 0.4
                release = 0.4
                if t < attack:
                    env = t / attack
                elif t > chord_duration - release:
                    env = max(0.0, (chord_duration - t) / release)

                # Multi-harmonic warmth
                sig = 0.6 * math.sin(2 * math.pi * freq * t)
                sig += 0.25 * math.sin(2 * math.pi * (freq * 2) * t)
                sig += 0.15 * math.sin(2 * math.pi * (freq * 3) * t)

                # Subtle stereo/chorus wobble
                sig *= (1.0 + 0.05 * math.sin(2 * math.pi * 1.5 * t_global))

                samples[idx] += sig * env * 0.18

        # Add arpeggio/rhythm elements according to mood
        if mood in ('inspirational', 'chill', 'upbeat', 'humorous'):
            arp_notes = chord
            note_len = beat_sec / 2.0
            num_notes = int(chord_duration / note_len)

            for n_idx in range(num_notes):
                n_start = c_start + n_idx * note_len
                n_start_sample = int(n_start * SAMPLE_RATE)
                n_samples = int(note_len * SAMPLE_RATE)
                n_note = arp_notes[n_idx % len(arp_notes)]
                n_freq = note_freq(NOTES.get(n_note, -9) + 12) # 1 octave higher

                for j in range(n_samples):
                    idx = n_start_sample + j
                    if idx >= num_samples:
                        break
                    tj = j / SAMPLE_RATE
                    # Pluck envelope
                    plk_env = math.exp(-tj * 7.0)
                    sig_plk = math.sin(2 * math.pi * n_freq * tj) + 0.3 * math.sin(2 * math.pi * n_freq * 2 * tj)
                    samples[idx] += sig_plk * plk_env * 0.12

        # Beat / pulse for upbeat & chill
        if mood in ('upbeat', 'chill'):
            for b in range(int(chord_duration / beat_sec)):
                b_start = c_start + b * beat_sec
                b_idx = int(b_start * SAMPLE_RATE)
                # Soft kick pulse
                kick_len = int(0.12 * SAMPLE_RATE)
                for k in range(min(kick_len, num_samples - b_idx)):
                    tk = k / SAMPLE_RATE
                    k_env = math.exp(-tk * 25.0)
                    k_freq = 110.0 * math.exp(-tk * 20.0) + 45.0
                    samples[b_idx + k] += math.sin(2 * math.pi * k_freq * tk) * k_env * 0.22

        # Suspense tension pulse
        if mood == 'suspense':
            pulse_sec = beat_sec
            for b in range(int(chord_duration / pulse_sec)):
                p_start = c_start + b * pulse_sec
                p_idx = int(p_start * SAMPLE_RATE)
                p_len = int(0.18 * SAMPLE_RATE)
                for k in range(min(p_len, num_samples - p_idx)):
                    tk = k / SAMPLE_RATE
                    p_env = math.exp(-tk * 12.0)
                    samples[p_idx + k] += (math.sin(2 * math.pi * 65.0 * tk) + 0.5 * math.sin(2 * math.pi * 68.0 * tk)) * p_env * 0.20

    # Normalize samples to avoid clipping
    max_val = max(abs(s) for s in samples) or 1.0
    norm_factor = 0.85 / max_val

    wav_path = os.path.join(OUT_DIR, f"{name}.wav")
    mp3_path = os.path.join(OUT_DIR, f"{name}.mp3")

    with wave.open(wav_path, 'w') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        for s in samples:
            val = int(s * norm_factor * 32767)
            val = max(-32768, min(32767, val))
            wf.writeframes(struct.pack('<hh', val, val))

    ffmpeg_bin = os.environ.get("FFMPEG_PATH")
    if not ffmpeg_bin:
        # Check node_modules for ffmpeg-static
        possible = [
            os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../node_modules/ffmpeg-static/ffmpeg")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../node_modules/.pnpm/ffmpeg-static@5.3.0/node_modules/ffmpeg-static/ffmpeg")),
            "ffmpeg",
        ]
        for p in possible:
            if os.path.exists(p):
                ffmpeg_bin = p
                break
        if not ffmpeg_bin:
            ffmpeg_bin = "ffmpeg"

    cmd = [
        ffmpeg_bin, "-y", "-i", wav_path,
        "-af", "aecho=0.8:0.88:40|60:0.3|0.2",
        "-c:a", "libmp3lame", "-b:a", "192k",
        mp3_path
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if os.path.exists(wav_path):
        os.remove(wav_path)
    print(f"Generated track: {mp3_path} ({total_duration:.1f}s)")

def main():
    tracks = [
        ("inspirational", [('C4', 'E4', 'G4', 'C3'), ('G3', 'B3', 'D4', 'G2'), ('A3', 'C4', 'E4', 'A2'), ('F3', 'A3', 'C4', 'F2')], 95, 'inspirational'),
        ("dramatic",      [('A3', 'C4', 'E4', 'A2'), ('F3', 'A3', 'C4', 'F2'), ('D3', 'F3', 'A3', 'D2'), ('E3', 'G3', 'B3', 'E2')], 85, 'dramatic'),
        ("upbeat",        [('C4', 'G4', 'E4', 'C3'), ('F4', 'A4', 'C5', 'F3'), ('A4', 'C5', 'E5', 'A3'), ('G4', 'B4', 'D5', 'G3')], 124, 'upbeat'),
        ("chill",         [('C4', 'E4', 'G4', 'B4'), ('A3', 'C4', 'E4', 'G4'), ('D4', 'F4', 'A4', 'C5'), ('G3', 'B3', 'D4', 'F4')], 82, 'chill'),
        ("suspense",      [('D3', 'F3', 'A3', 'D2'), ('D#3', 'G3', 'A#3', 'D#2'), ('D3', 'F3', 'G#3', 'D2'), ('C#3', 'E3', 'G3', 'C#2')], 75, 'suspense'),
        ("humorous",      [('C4', 'E4', 'G4', 'C3'), ('F3', 'A3', 'C4', 'F2'), ('G3', 'B3', 'D4', 'G2'), ('C4', 'E4', 'G4', 'C3')], 115, 'humorous'),
    ]
    for name, chords, bpm, mood in tracks:
        generate_track(name, chords, tempo_bpm=bpm, mood=mood, duration_beats=32)

if __name__ == "__main__":
    main()
