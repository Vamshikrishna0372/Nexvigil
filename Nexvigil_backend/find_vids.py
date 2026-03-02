import os
from pathlib import Path

media_dir = "media"
for root, dirs, files in os.walk(media_dir):
    for name in files:
        if name.endswith(".webm") or name.endswith(".mp4"):
            print(f"Found: {os.path.join(root, name)}")
