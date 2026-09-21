"""
Generate original, copyright-safe cinematic sound effects (SFX) for AI Video Studio:
1. whoosh.mp3 (scene transition swoosh)
2. impact.mp3 (punchline / dramatic climax hit)
3. riser.mp3 (suspense / question riser)
"""
import os
import math
import struct
import wave
import subprocess

SAMPLE_RATE = 44100
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../assets/audio/sfx"))
os.makedirs(OUT_DIR, exist_ok=True)

def write_wav(filename, samples):
    with wave.open(filename, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        int_samples = [max(-32767, min(32767, int(s * 32767))) for s in samples]
        wav.writeframes(struct.pack(f'<{len(int_samples)}h', *int_samples))

def convert_to_mp3(wav_path, mp3_path):
    cmd = ['ffmpeg', '-y', '-i', wav_path, '-b:a', '192k', mp3_path]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    if os.path.exists(wav_path):
        os.remove(wav_path)

def generate_whoosh():
    """Generates a smooth aerodynamic whoosh / transition sweep (0.6s)."""
    duration = 0.6
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    
    import random
    random.seed(42)
    
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # Center peak envelope around t = 0.28
        progress = t / duration
        envelope = math.sin(progress * math.pi) ** 2.2
        
        # Bandpassed noise sweep (frequency rises then falls)
        center_freq = 250.0 + 1200.0 * math.sin(progress * math.pi)
        sine1 = math.sin(2 * math.pi * center_freq * t)
        sine2 = math.sin(2 * math.pi * (center_freq * 1.5) * t) * 0.5
        noise = (random.random() * 2 - 1) * 0.4
        
        val = (sine1 + sine2 + noise) * envelope * 0.7
        samples.append(val)
        
    wav_path = os.path.join(OUT_DIR, "whoosh.wav")
    mp3_path = os.path.join(OUT_DIR, "whoosh.mp3")
    write_wav(wav_path, samples)
    convert_to_mp3(wav_path, mp3_path)
    print("Generated whoosh.mp3")

def generate_impact():
    """Generates a deep cinematic bass impact / punchline hit (1.0s)."""
    duration = 1.0
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    
    import random
    random.seed(101)
    
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        # Fast attack, exponential decay
        env = math.exp(-4.5 * t)
        
        # Pitch drop from 180 Hz to 45 Hz
        pitch = 45.0 + 135.0 * math.exp(-12.0 * t)
        sub_bass = math.sin(2 * math.pi * pitch * t)
        
        # Subtle initial burst
        noise_burst = (random.random() * 2 - 1) * math.exp(-25.0 * t) * 0.5
        
        val = (sub_bass * 0.8 + noise_burst) * env
        samples.append(val)
        
    wav_path = os.path.join(OUT_DIR, "impact.wav")
    mp3_path = os.path.join(OUT_DIR, "impact.mp3")
    write_wav(wav_path, samples)
    convert_to_mp3(wav_path, mp3_path)
    print("Generated impact.mp3")

def generate_riser():
    """Generates a subtle cinematic build-up riser (1.2s)."""
    duration = 1.2
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        progress = t / duration
        env = progress ** 1.8
        
        # Pitch rises from 120 Hz to 650 Hz
        freq = 120.0 + 530.0 * (progress ** 2)
        sine = math.sin(2 * math.pi * freq * t)
        sine2 = math.sin(2 * math.pi * (freq * 2.01) * t) * 0.4
        
        val = (sine + sine2) * env * 0.6
        samples.append(val)
        
    wav_path = os.path.join(OUT_DIR, "riser.wav")
    mp3_path = os.path.join(OUT_DIR, "riser.mp3")
    write_wav(wav_path, samples)
    convert_to_mp3(wav_path, mp3_path)
    print("Generated riser.mp3")

if __name__ == "__main__":
    generate_whoosh()
    generate_impact()
    generate_riser()
