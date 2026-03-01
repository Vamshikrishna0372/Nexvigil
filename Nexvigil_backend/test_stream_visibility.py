import pathlib
import os

# Mock settings
MEDIA_DIR = "media"
camera_id = "69975cf679253cbf28e1795e"

media_path = pathlib.Path(MEDIA_DIR) / "live" / f"{camera_id}.jpg"

print(f"CWD: {os.getcwd()}")
print(f"Checking path: {media_path}")
print(f"Exists: {media_path.exists()}")
if media_path.exists():
    print(f"Size: {os.path.getsize(media_path)}")
    try:
        content = media_path.read_bytes()
        print(f"Read {len(content)} bytes successfully")
    except Exception as e:
        print(f"Error reading: {e}")
else:
    # List contents of media/live if it exists
    live_dir = pathlib.Path(MEDIA_DIR) / "live"
    if live_dir.exists():
        print(f"Contents of {live_dir}:")
        for f in live_dir.iterdir():
            print(f"  {f.name}")
    else:
        print(f"{live_dir} does not exist")
