import os
import re
import requests

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from googleapiclient.discovery import build
from pydantic import BaseModel


load_dotenv()
API_KEY = os.getenv("YOUTUBE_API_KEY")

if not API_KEY:
    raise RuntimeError("YOUTUBE_API_KEY not found. Add it to a .env file.")


youtube = build("youtube", "v3", developerKey=API_KEY)


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)



free_use_keywords = [
    "free to use",
    "royalty free",
    "no copyright",
    "copyright free",
    "free download",
    "music promoted by",
    "attribution required",
    "must credit",
    "you are free to use this song",
    "please add this in your description",
]


class CheckRequest(BaseModel):
    url: str



def extract_video_id(url: str):
  
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11}).*",
        r"youtu\.be\/([0-9A-Za-z_-]{11})",
        r"shorts\/([0-9A-Za-z_-]{11})",
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    return None



def get_video_details(video_id: str):
   
    request = youtube.videos().list(
        part="snippet,contentDetails,status",
        id=video_id
    )
    response = request.execute()

    if len(response["items"]) == 0:
        raise HTTPException(status_code=404, detail="Video not found.")

    video = response["items"][0]


    return {
        "title": video["snippet"]["title"],
        "published_date": video["snippet"]["publishedAt"],
        "channel": video["snippet"]["channelTitle"],
        "description": video["snippet"]["description"],
        "category_id": video["snippet"]["categoryId"],
        "licensed_content": video["contentDetails"]["licensedContent"],
        "video_license": video["status"].get("license"),
        "made_for_kids": video["status"].get("madeForKids"),
    }


def get_genre(song_title: str):
   
    response = requests.get(
        "https://itunes.apple.com/search",
        params={"term": song_title, "media": "music", "limit": 1}
    )
    results = response.json()["results"]

    if len(results) == 0:
        return None

    return results[0]["primaryGenreName"]



def decide_verdict(video: dict):

    free_use = False

    description_lower = video["description"].lower()
    for i in free_use_keywords:
        if i in description_lower:
            free_use = True

    
    if video["video_license"] == "creativeCommon":
        return {
            "verdict": "clear",
            "badge_text": "Not Copyrighted",
            "message": (
                "Copyright Status: NOT FLAGGED (no Content ID claim detected). "
                "Note: This indicates no known Content ID claim at the time of "
                "checking. It is not a legal guarantee of copyright-free status."
            ),
        }

    
    if video["licensed_content"] and free_use:
        return {
            "verdict": "verify",
            "badge_text": "Attribution Required",
            "message": (
                "This content is claimed by a rights holder but the description "
                "suggests it may be usable with attribution. Read the video "
                "description carefully for exact terms before using."
            ),
        }

    
    if video["licensed_content"]:
        return {
            "verdict": "claim",
            "badge_text": "Copyrighted",
            "message": "Copyright Status: COPYRIGHTED (Content ID claim detected).",
        }

   
    return {
        "verdict": "clear",
        "badge_text": "Not flagged",
        "message": (
            "Copyright Status: NOT FLAGGED (no Content ID claim detected). "
            "Note: This indicates no known Content ID claim at the time of "
            "checking. It is not a legal guarantee of copyright-free status."
        ),
    }


def clean_song_title(raw_title: str) -> str:
   
    cleaned = re.sub(r"\(.*?\)|\[.*?\]", "", raw_title)
    cleaned = re.sub(r"(?i)\b(official video|official audio|music video|lyrics|ft\.|feat\.)\b", "", cleaned)
    return " ".join(cleaned.split()).strip()


def is_safe_alternative(video_item: dict) -> bool:
    
    video_id = video_item["id"]["videoId"]
    try:
        # Fetch status and license metadata for candidate video
        request = youtube.videos().list(
            part="snippet,contentDetails,status",
            id=video_id
        )
        response = request.execute()
        if not response.get("items"):
            return False

        item = response["items"][0]
        temp_video_data = {
            "title": item["snippet"]["title"],
            "description": item["snippet"]["description"],
            "licensed_content": item["contentDetails"]["licensedContent"],
            "video_license": item["status"].get("license"),
        }

        # Check against verdict rules
        verdict = decide_verdict(temp_video_data)
        return verdict["verdict"] != "claim"
    except Exception:
        return False


def search_and_verify_alternatives(query: str, needed_count: int = 3):
    
    try:
        # Search candidate pool
        request = youtube.search().list(
            part="snippet",
            type="video",
            q=query,
            maxResults=10,
        )
        response = request.execute()

        verified_alternatives = []
        for item in response.get("items", []):
            if is_safe_alternative(item):
                verified_alternatives.append({
                    "title": item["snippet"]["title"],
                    "channel": item["snippet"]["channelTitle"],
                    "url": "https://www.youtube.com/watch?v=" + item["id"]["videoId"],
                })
                if len(verified_alternatives) >= needed_count:
                    break

        return verified_alternatives
    except Exception:
        return []


def find_alternatives(song_title: str, genre: str):
    
    clean_title = clean_song_title(song_title)


    specific_query = f"{clean_title} slowed reverb no copyright royalty free"
    recommendations = search_and_verify_alternatives(specific_query, needed_count=3)

    
    if len(recommendations) < 3:
        fallback_genre = genre if genre else "Ambient"
        genre_query = f"{fallback_genre} royalty free music no copyright"
        fallback_recs = search_and_verify_alternatives(genre_query, needed_count=3 - len(recommendations))
        recommendations.extend(fallback_recs)

    return recommendations


@app.post("/api/check")
def check_song(payload: CheckRequest):
    video_id = extract_video_id(payload.url)
    if video_id is None:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL.")

    video = get_video_details(video_id)
    genre = get_genre(video["title"])
    verdict = decide_verdict(video)


    if verdict["verdict"] == "claim":
        alternatives = find_alternatives(video["title"], genre)
    else:
        alternatives = []

    return {
        "title": video["title"],
        "published_date": video["published_date"],
        "channel": video["channel"],
        "genre": genre,
        "category_id": video["category_id"],
        "made_for_kids": video["made_for_kids"],
        "recommendations": alternatives,
        "verdict": verdict["verdict"],
        "badge_text": verdict["badge_text"],
        "message": verdict["message"],
        "license_note": video["video_license"] or "Standard YouTube License",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}