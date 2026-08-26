import os
import re
import sys
import requests
from dotenv import load_dotenv
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

load_dotenv()

API_KEY = os.getenv("YOUTUBE_API_KEY")

if not API_KEY:
    print("ERROR: YOUTUBE_API_KEY not found. Add it to a .env file.")
    sys.exit(1)


def extract_video_id(url: str):
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11}).*",   
        r"youtu\.be\/([0-9A-Za-z_-]{11})",   
        r"shorts\/([0-9A-Za-z_-]{11})",      
        r"embed\/([0-9A-Za-z_-]{11})",       
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def check_copyright(video_id: str, youtube):
    
    try:
        request = youtube.videos().list(
            part="snippet,contentDetails,status",
            id=video_id
        )
        response = request.execute()

    except HttpError as e:
        print(f"API error: {e}")
        return None

    items = response.get("items", [])
    if not items:
        print("No video found for this ID. Check the URL and try again.")
        return None

    video = items[0]
    snippet = video["snippet"]
    
    content_details = video["contentDetails"]
    status = video.get("status", {})


    video_license = status.get("license")
    is_licensed = content_details.get("licensedContent", False)


    report = {
        "video_id": video_id,
        "title": snippet.get("title"),
        "published_date":snippet.get("publishedAt"),
        "channel": snippet.get("channelTitle"),
        "description": snippet.get("description", ""),
        "tags": snippet.get("tags", []),
        "category_id": snippet.get("categoryId"),
        "licensed_content": is_licensed,
        "video_license": video_license,
        "made_for_kids": status.get("madeForKids"),
        "url": f"https://www.youtube.com/watch?v={video_id}",
    }
    return report

def get_genre_itunes(title: str):
    query = f"{title}".strip()
    response = requests.get(
        "https://itunes.apple.com/search",
        params={"term": query, "media": "music", "limit": 1}
    )
    results = response.json().get("results", [])
    if results:
        return results[0].get("primaryGenreName")
    return None


def print_report(report: dict):
    free_to_use = False
    print("\n" + "=" * 60)
    print(f"Title          : {report['title']}")
    print(f"Published Date : {report['published_date']}")
    print(f"Channel        : {report['channel']}")
    print(f"Video URL      : {report['url']}")
    print(f"Genre          : {get_genre_itunes(report["title"])}")
    print(f"Video License  : {report['video_license']}")
    print(f"Category ID    : {report['category_id']}")
    print(f"Made For Kids  : {report['made_for_kids']}")

    print("-" * 60)

    free_use_keywords = [
    "free to use", "royalty free", "no copyright", "copyright free",
    "free download", "music promoted by", "attribution required",
    "must credit", "you are free to use this song", "please add this in your description"
    ]

    for i in free_use_keywords:
        if i in report["description"]:
            free_to_use = True 

        
    if report["video_license"] == "creativeCommon":
        print("Copyright Status : NOT FLAGGED (no Content ID claim detected)")
        print(
            "\nNote: This indicates no known Content ID claim at the time "
            "of checking. It is not a legal guarantee of copyright-free status."
        )

    elif report["licensed_content"] and free_to_use:
        print("This content is claimed by a rights holder"
              " but the description suggests it may be usable with attribution" 
              " Read the video description carefully for exact terms before using.")

    elif report["licensed_content"]:
        print("Copyright Status : COPYRIGHTED (Content ID claim detected)")

    else:
        print("Copyright Status : NOT FLAGGED (no Content ID claim detected)")

        print(
            "\nNote: This indicates no known Content ID claim at the time "
            "of checking. It is not a legal guarantee of copyright-free status."
        )

    print("=" * 60 + "\n")



def main():
    youtube = build("youtube", "v3", developerKey=API_KEY)

    url = input("Enter the YouTube URL of the song: ").strip()
    video_id = extract_video_id(url)

    if not video_id:
        print("Could not extract a valid video ID from that URL.")
        return

    report = check_copyright(video_id, youtube)
    if report:
        print_report(report)


if __name__ == "__main__":
    main()