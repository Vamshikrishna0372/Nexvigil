import cv2, os, sys, requests, time

BACKEND_ROOT = os.path.dirname(os.path.abspath(__file__))
MEDIA_DIR    = os.path.join(BACKEND_ROOT, "media")
LIVE_DIR     = os.path.join(MEDIA_DIR, "live")
os.makedirs(LIVE_DIR, exist_ok=True)

results = []
results.append("=== Nexvigil Stream Pipeline Test ===")

# 1. Camera
cap = cv2.VideoCapture(0)
opened = cap.isOpened()
results.append(f"1_CAMERA_OPENED: {opened}")
if opened:
    ret, frame = cap.read()
    results.append(f"1_READ: {ret}")
    if ret:
        frame = cv2.resize(frame, (640, 480))
        results.append(f"1_SHAPE: {frame.shape}")
        # Write frame
        test_id  = "test_stream_cam"
        live_path = os.path.join(LIVE_DIR, f"{test_id}.jpg")
        ok, buf   = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        results.append(f"2_IMENCODE: {ok}")
        if ok:
            with open(live_path + ".tmp", "wb") as f:
                f.write(buf.tobytes())
            os.replace(live_path + ".tmp", live_path)
            results.append(f"2_FRAME_WRITTEN: {os.path.getsize(live_path)}B at {live_path}")
    cap.release()
    results.append("1_CAMERA_RELEASED")

# 2. DB cameras via API
from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_ROOT, ".env"))
INTERNAL_KEY = os.getenv("INTERNAL_API_KEY", "")
BACKEND_URL  = "http://localhost:8000/api/v1"
headers = {"x-api-key": INTERNAL_KEY}
try:
    r = requests.get(f"{BACKEND_URL}/internal/cameras/active", headers=headers, timeout=5)
    results.append(f"3_API_STATUS: {r.status_code}")
    if r.status_code == 200:
        cams = r.json()
        results.append(f"3_CAMERAS_COUNT: {len(cams)}")
        for c in cams:
            results.append(f"  3_CAM: id={c['id']} url={c.get('camera_url')} name={c.get('camera_name')}")
    else:
        results.append(f"3_API_BODY: {r.text[:300]}")
except Exception as e:
    results.append(f"3_API_ERROR: {e}")

# 3. Stream endpoint
try:
    r2 = requests.get(f"{BACKEND_URL}/internal/cameras/active", headers=headers, timeout=5)
    if r2.status_code == 200 and r2.json():
        cam_id = r2.json()[0]["id"]
        r3 = requests.get(f"{BACKEND_URL}/cameras/{cam_id}/stream", stream=True, timeout=5)
        first = next(r3.iter_content(512), b"")
        results.append(f"4_STREAM_STATUS: {r3.status_code}")
        results.append(f"4_STREAM_BYTES: {first[:60]}")
        has_frame = b"--frame" in first or b"\xff\xd8" in first
        results.append(f"4_HAS_FRAME_DATA: {has_frame}")
        r3.close()
except Exception as e:
    results.append(f"4_STREAM_ERROR: {e}")

output = "\n".join(results)
print(output)
with open("test_results.txt", "w", encoding="utf-8") as f:
    f.write(output)
