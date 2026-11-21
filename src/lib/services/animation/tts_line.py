"""Synthesize one dialogue line with Microsoft Edge TTS (free, no API key).

Usage: python tts_line.py <text> <output.mp3> <voice> [rate] [pitch]
rate like "+10%", pitch like "+20Hz".
"""
import asyncio
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


async def run(text, output_file, voice, rate, pitch):
    import edge_tts

    last_error = None
    for attempt in range(3):
        try:
            communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
            chunks = []
            async for event in communicate.stream():
                if event["type"] == "audio":
                    chunks.append(event["data"])
            if not chunks:
                raise RuntimeError("no audio returned")
            os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
            with open(output_file, "wb") as f:
                for chunk in chunks:
                    f.write(chunk)
            return
        except Exception as error:  # noqa: BLE001
            last_error = error
            await asyncio.sleep(2 ** attempt)
    raise RuntimeError(f"Edge TTS failed: {last_error}")


def main():
    if len(sys.argv) < 4:
        print("Usage: python tts_line.py <text> <output> <voice> [rate] [pitch]")
        sys.exit(1)
    text, output_file, voice = sys.argv[1], sys.argv[2], sys.argv[3]
    rate = sys.argv[4] if len(sys.argv) > 4 else "+0%"
    pitch = sys.argv[5] if len(sys.argv) > 5 else "+0Hz"
    try:
        asyncio.run(run(text, output_file, voice, rate, pitch))
    except Exception as error:  # noqa: BLE001
        print(f"tts_line error: {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
