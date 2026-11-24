"""Synthesize one dialogue line with Microsoft Edge TTS (free, no API key).

Usage: python tts_line.py <text> <output.mp3> <voice> [rate] [pitch] [words.json]
rate like "+10%", pitch like "+20Hz". When words.json is given, Edge TTS
WordBoundary events are written there as [{"t": sec, "d": sec, "w": word}].
"""
import asyncio
import json
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


async def run(text, output_file, voice, rate, pitch, words_file=None):
    import edge_tts

    last_error = None
    for attempt in range(3):
        try:
            communicate = edge_tts.Communicate(
                text, voice, rate=rate, pitch=pitch, boundary="WordBoundary"
            )
            chunks = []
            words = []
            async for event in communicate.stream():
                if event["type"] == "audio":
                    chunks.append(event["data"])
                elif event["type"] == "WordBoundary":
                    words.append(
                        {
                            "t": event["offset"] / 1e7,
                            "d": event["duration"] / 1e7,
                            "w": event["text"],
                        }
                    )
            if not chunks:
                raise RuntimeError("no audio returned")
            os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
            with open(output_file, "wb") as f:
                for chunk in chunks:
                    f.write(chunk)
            if words_file:
                with open(words_file, "w", encoding="utf-8") as f:
                    json.dump(words, f, ensure_ascii=False)
            return
        except Exception as error:  # noqa: BLE001
            last_error = error
            await asyncio.sleep(2 ** attempt)
    raise RuntimeError(f"Edge TTS failed: {last_error}")


def run_pyttsx3(text, output_file):
    """Offline fallback (robotic). Only used after Edge TTS keeps failing."""
    import pyttsx3

    os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
    engine = pyttsx3.init()
    engine.setProperty("rate", 165)
    engine.save_to_file(text, output_file)
    engine.runAndWait()
    if not os.path.exists(output_file) or os.path.getsize(output_file) < 1000:
        raise RuntimeError("pyttsx3 produced no audio")


def main():
    if len(sys.argv) >= 4 and sys.argv[1] == "--pyttsx3":
        try:
            run_pyttsx3(sys.argv[2], sys.argv[3])
        except Exception as error:  # noqa: BLE001
            print(f"pyttsx3 error: {error}", file=sys.stderr)
            sys.exit(1)
        return
    if len(sys.argv) < 4:
        print("Usage: python tts_line.py <text> <output> <voice> [rate] [pitch]")
        sys.exit(1)
    text, output_file, voice = sys.argv[1], sys.argv[2], sys.argv[3]
    rate = sys.argv[4] if len(sys.argv) > 4 else "+0%"
    pitch = sys.argv[5] if len(sys.argv) > 5 else "+0Hz"
    words_file = sys.argv[6] if len(sys.argv) > 6 else None
    try:
        asyncio.run(run(text, output_file, voice, rate, pitch, words_file))
    except Exception as error:  # noqa: BLE001
        print(f"tts_line error: {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
