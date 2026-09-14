

import argparse
import asyncio
import os
import sys
import tempfile

import sounddevice as sd
from scipy.io.wavfile import write as write_wav
from shazamio import Shazam

SAMPLE_RATE = 44100   
CHANNELS = 1          


def record_clip(seconds: int) -> str:
  
    print(f"\n🎙  Recording for {seconds} seconds... play the song now.")

    
    audio = sd.rec(
        int(seconds * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype="int16",
    )
    sd.wait()

    print("✅ Done recording. Identifying...")

    temp_path = os.path.join(tempfile.gettempdir(), "copyright_intel_clip.wav")
    write_wav(temp_path, SAMPLE_RATE, audio)

    return temp_path


async def identify_song(audio_path: str):
    shazam = Shazam()
    result = await shazam.recognize(audio_path)

    track = result.get("track")
    if not track:
        return None

    return {
        "title": track.get("title"),
        "artist": track.get("subtitle"),
        "genre": track.get("genres", {}).get("primary"),
        "shazam_url": track.get("url"),
    }


def print_result(match: dict | None):
    if not match:
        print("\nNo match found. Try recording again, closer to the speaker or for longer.")
        return

    print("\n" + "-" * 50)
    print(f"Title  : {match['title']}")
    print(f"Artist : {match['artist']}")
    print(f"Genre  : {match['genre']}")
    print(f"Link   : {match['shazam_url']}")
    print("-" * 50)


def main():
    parser = argparse.ArgumentParser(description="Listen to a song via mic and identify it.")
    parser.add_argument(
        "--seconds", type=int, default=8,
        help="How many seconds to record (default: 8). Shazam's matching works well on short clips."
    )
    args = parser.parse_args()

    try:
        clip_path = record_clip(args.seconds)
    except Exception as e:
        print(f"ERROR: Couldn't access the microphone — {e}")
        print("Check that a microphone is connected and PortAudio is installed.")
        sys.exit(1)

    match = asyncio.run(identify_song(clip_path))
    print_result(match)

    os.remove(clip_path)


if __name__ == "__main__":
    main()