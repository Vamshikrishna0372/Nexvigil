import cv2
import os
import glob

# Find latest mp4 in media/recordings
files = glob.glob("media/recordings/**/*.mp4", recursive=True)
if not files:
    print("No mp4 files found.")
    exit()

latest_file = max(files, key=os.path.getmtime)
print(f"Checking latest video: {latest_file}")
print(f"File size: {os.path.getsize(latest_file)} bytes")

cap = cv2.VideoCapture(latest_file)
if not cap.isOpened():
    print("FAILED to open video file with OpenCV.")
else:
    width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    fps = cap.get(cv2.CAP_PROP_FPS)
    count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    print(f"Resolution: {width}x{height}")
    print(f"FPS: {fps}")
    print(f"Frame Count: {count}")
    
    ret, frame = cap.read()
    print(f"First frame read successfully: {ret}")
    cap.release()
