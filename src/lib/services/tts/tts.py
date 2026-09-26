import sys
import asyncio
import json
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

async def generate_edge_tts(text, output_file, voice, timings_file=None, rate="+0%", pitch="+0Hz", volume="+0%"):
    import edge_tts

    last_error = None
    audio_chunks = []
    sentences = []

    # Clean and format parameters
    rate_str = rate if rate and (rate.startswith("+") or rate.startswith("-")) else f"{rate or '+0%'}"
    if not rate_str.endswith("%"):
        rate_str = f"{rate_str}%"
    if not (rate_str.startswith("+") or rate_str.startswith("-")):
        rate_str = f"+{rate_str}"

    pitch_str = pitch if pitch and (pitch.startswith("+") or pitch.startswith("-")) else f"{pitch or '+0Hz'}"
    if not pitch_str.endswith("Hz"):
        pitch_str = f"{pitch_str}Hz"
    if not (pitch_str.startswith("+") or pitch_str.startswith("-")):
        pitch_str = f"+{pitch_str}"

    volume_str = volume if volume and (volume.startswith("+") or volume.startswith("-")) else f"{volume or '+0%'}"
    if not volume_str.endswith("%"):
        volume_str = f"{volume_str}%"
    if not (volume_str.startswith("+") or volume_str.startswith("-")):
        volume_str = f"+{volume_str}"

    for attempt in range(3):
        try:
            communicate = edge_tts.Communicate(
                text=text,
                voice=voice,
                rate=rate_str,
                pitch=pitch_str,
                volume=volume_str,
            )
            attempt_audio = []
            attempt_sentences = []

            async for event in communicate.stream():
                if event["type"] == "audio":
                    attempt_audio.append(event["data"])
                elif event["type"] == "SentenceBoundary":
                    # offset and duration are in 100-nanosecond units -> convert to seconds
                    start_sec = event["offset"] / 10_000_000
                    duration_sec = event["duration"] / 10_000_000
                    attempt_sentences.append({
                        "text": event["text"],
                        "start": round(start_sec, 3),
                        "end": round(start_sec + duration_sec, 3),
                    })

            if not attempt_audio:
                raise RuntimeError(
                    f"Edge TTS returned no audio for voice '{voice}'"
                )

            audio_chunks = attempt_audio
            sentences = attempt_sentences
            break
        except Exception as error:
            last_error = error
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)
    else:
        raise RuntimeError(f"Edge TTS failed after 3 attempts: {last_error}")

    # Ensure destination directory exists
    out_dir = os.path.dirname(os.path.abspath(output_file))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    # Write audio file
    with open(output_file, "wb") as f:
        for chunk in audio_chunks:
            f.write(chunk)

    # Write timings file if requested
    if timings_file:
        t_dir = os.path.dirname(os.path.abspath(timings_file))
        if t_dir:
            os.makedirs(t_dir, exist_ok=True)

        with open(timings_file, "w", encoding="utf-8") as f:
            json.dump(sentences if sentences else [], f, ensure_ascii=False)
        if sentences:
            print(f"Timings written to: {timings_file}")

    print(f"Voice generated with Edge TTS ({voice} | rate: {rate_str} | pitch: {pitch_str}): {output_file}")


def generate_pyttsx3(text, output_file):
    out_dir = os.path.dirname(os.path.abspath(output_file))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    import pyttsx3
    engine = pyttsx3.init()
    engine.setProperty("rate", 165)
    engine.save_to_file(text, output_file)
    engine.runAndWait()


def main():
    if len(sys.argv) < 3:
        print("Usage: python tts.py <text> <output_file> [voice] [timings_file] [rate] [pitch] [volume]")
        sys.exit(1)

    text = sys.argv[1]
    output_file = sys.argv[2]
    voice = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "" else "en-US-AndrewNeural"
    timings_file = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != "" and sys.argv[4] != "null" else None
    rate = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] != "" else "+0%"
    pitch = sys.argv[6] if len(sys.argv) > 6 and sys.argv[6] != "" else "+0Hz"
    volume = sys.argv[7] if len(sys.argv) > 7 and sys.argv[7] != "" else "+0%"

    try:
        asyncio.run(generate_edge_tts(text, output_file, voice, timings_file, rate=rate, pitch=pitch, volume=volume))
    except Exception as e:
        print(f"Edge TTS error ({e}), falling back to pyttsx3...", file=sys.stderr)
        try:
            generate_pyttsx3(text, output_file)
            print(f"Voice generated with pyttsx3: {output_file}")
        except Exception as py_err:
            print(f"pyttsx3 error: {py_err}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
