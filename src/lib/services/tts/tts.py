import sys
import asyncio
import json
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

async def generate_edge_tts(text, output_file, voice, timings_file=None):
    import edge_tts

    last_error = None
    audio_chunks = []
    sentences = []

    for attempt in range(3):
        try:
            communicate = edge_tts.Communicate(text, voice)
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

    print(f"Voice generated with Edge TTS ({voice}): {output_file}")


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
        print("Usage: python tts.py <text> <output_file> [voice] [timings_file]")
        sys.exit(1)

    text = sys.argv[1]
    output_file = sys.argv[2]
    voice = sys.argv[3] if len(sys.argv) > 3 else "en-US-ChristopherNeural"
    timings_file = sys.argv[4] if len(sys.argv) > 4 else None

    try:
        asyncio.run(generate_edge_tts(text, output_file, voice, timings_file))
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
