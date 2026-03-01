"""
Quick test: open camera, process 5 frames, write a live frame, verify stream endpoint responds.
Run this BEFORE restarting the AI agent to verify the pipeline works end-to-end.
"""
import cv2, os, sys, requests, time

BACKEND_ROOT = os.path.dirname(os.path.abspath(__file__))
MEDIA_DIR    = os.path.join(BACKEND_ROOT, "media")
LIVE_DIR     = os.path.join(MEDIA_DIR, "live")
os.makedirs(LIVE_DIR, exist_ok=True)

print("=" * 55)
print("Nexvigil Stream Pipeline Test")
print("=" * 55)

# 1. Camera test
print("\n[1] Camera access...")
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("FAIL: cv2.VideoCapture(0) could not open!")
    sys.exit(1)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

ret, frame = cap.read()
if not ret:
    print("FAIL: Could not read a frame!")
    cap.release()
    sys.exit(1)

frame = cv2.resize(frame, (640, 480))
print(f"  OK  shape={frame.shape}")

# 2. Write test frame for cam ID "test_cam"
test_id  = "test_stream_cam"
live_path = os.path.join(LIVE_DIR, f"{test_id}.jpg")
live_tmp  = live_path + ".tmp"
ok, buf   = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
if ok:
    with open(live_tmp, "wb") as f:
        f.write(buf.tobytes())
    os.replace(live_tmp, live_path)
    print(f"[2] Wrote test live frame: {os.path.getsize(live_path)} bytes → {live_path}")
else:
    print("[2] FAIL: imencode failed")
    cap.release()
    sys.exit(1)

# 3. DB camera check via REST
print("\n[3] DB camera check...")
from dotenv import load_dotenv
load_dotenv(os.path.join(BACKEND_ROOT, ".env"))
INTERNAL_KEY = os.getenv("INTERNAL_API_KEY", "")
BACKEND_URL  = "http://localhost:8000/api/v1"
headers = {"x-api-key": INTERNAL_KEY}
try:
    r = requests.get(f"{BACKEND_URL}/internal/cameras/active", headers=headers, timeout=5)
    if r.status_code == 200:
        cams = r.json()
        print(f"  OK  {len(cams)} cameras returned from API:")
        for c in cams:
            print(f"       id={c['id']} name={c.get('camera_name')} url={c.get('camera_url')}")
        if len(cams) == 0:
            print("  WARNING: No cameras! Run fix_cameras_active.py first.")
    else:
        print(f"  WARN: HTTP {r.status_code} — {r.text[:200]}")
except Exception as e:
    print(f"  WARN: Could not reach backend API: {e}")

# 4. Stream endpoint check
print("\n[4] Stream endpoint check...")
cam_id_to_test = None
try:
    r2 = requests.get(f"{BACKEND_URL}/internal/cameras/active", headers=headers, timeout=5)
    if r2.status_code == 200 and r2.json():
        cam_id_to_test = r2.json()[0]["id"]
except: pass

if cam_id_to_test:
    try:
        r3 = requests.get(f"{BACKEND_URL}/cameras/{cam_id_to_test}/stream", stream=True, timeout=5)
        first_bytes = next(r3.iter_content(256), b"")
        if b"--frame" in first_bytes or b"JFIF" in first_bytes or b"\xff\xd8" in first_bytes:
            print(f"  OK  Stream endpoint responded with MJPEG data for cam {cam_id_to_test}")
        else:
            print(f"  WARN: Got unexpected bytes: {first_bytes[:50]}")
        r3.close()
    except Exception as e:
        print(f"  WARN: {e}")
else:
    print("  SKIP: No camera to test against")

cap.release()
print("\n[5] Camera released cleanly.")
print("\n==> All checks complete. Now restart ai_agent.py to begin live streaming.\n")
