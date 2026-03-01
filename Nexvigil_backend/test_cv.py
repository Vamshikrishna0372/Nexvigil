import cv2
import time
urls = [
    "http://192.168.0.117:8080/video",
    "https://192.168.0.117:8080/video",
    "http://192.168.0.117:8080/shot.jpg"
]
for url in urls:
    print(f"Testing {url}...")
    cap = cv2.VideoCapture(url)
    if not cap.isOpened():
        print(f"Failed to open {url}")
        continue
    ret, frame = cap.read()
    if ret:
        print(f"Successfully read from {url}")
    else:
        print(f"Opened but failed to read from {url}")
    cap.release()
