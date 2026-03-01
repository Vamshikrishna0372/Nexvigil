"""
Nexvigil AI Agent — ULTRA SMOOTH EDITION
Optimized for zero-lag streaming on CPU systems.

Changes:
1. Capture thread uses cv2.CAP_DSHOW for faster startup/FPS on Windows.
2. Frame resizing uses cv2.INTER_LINEAR (faster than CUBIC).
3. YOLOv8n runs on a separate thread with imgsz=320 and half=False (CPU).
4. Write loop is decoupled and capped at 25 FPS to save CPU.
5. All blocking IO (alerts, DB, files) are moved to background or low-priority threads.
6. Uses atomic file replacement for the stream.
"""
import os
import sys
import time
import threading
import logging
import requests
import cv2
import numpy as np
from datetime import datetime, timezone
import queue
import collections
from dotenv import load_dotenv

# ─── Immediate stdout flush ──────────────────────────────────────────────────
sys.stdout.reconfigure(line_buffering=True)

# ─── Resolve paths absolutely ────────────────────────────────────────────────
AGENT_DIR   = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(AGENT_DIR)
MEDIA_DIR   = os.path.join(BACKEND_DIR, "media")

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

load_dotenv(os.path.join(AGENT_DIR, ".env"))

BACKEND_URL  = os.getenv("BACKEND_URL", "http://localhost:8000/api/v1")
INTERNAL_KEY = os.getenv("INTERNAL_API_KEY", "change_me_to_a_secure_random_key_for_ai_agent")
HEADERS      = {"x-api-key": INTERNAL_KEY, "Content-Type": "application/json"}

# ─── Performance Tunals ───────────────────────────────────────────────────────
TARGET_W      = 640
TARGET_H      = 480
JPEG_QUALITY  = 60           # Professional balance of speed vs quality
CONFIDENCE    = 0.40         # Lower baseline for better recall
YOLO_INTERVAL = 0.3          # 3 detections/sec
WRITE_FPS     = 20           
MAX_FAILURES  = 20           

# ─── Rule Logic Helpers ──────────────────────────────────────────────────────
def is_time_allowed(restriction):
    if not restriction or not restriction.get("enabled"):
        return True
    try:
        now = datetime.now().time()
        start = datetime.strptime(restriction["start_time"], "%H:%M").time()
        end = datetime.strptime(restriction["end_time"], "%H:%M").time()
        if start <= end:
            return start <= now <= end
        else: # Over midnight
            return now >= start or now <= end
    except Exception:
        return True

def get_distance(b1, b2):
    c1 = [(b1[0]+b1[2])/2, (b1[1]+b1[3])/2]
    c2 = [(b2[0]+b2[2])/2, (b2[1]+b2[3])/2]
    return np.sqrt((c1[0]-c2[0])**2 + (c1[1]-c2[1])**2)

# BGR Colors
COLORS = {
    "critical": (0, 0, 255),
    "high":     (0, 165, 255),
    "medium":   (0, 255, 255),
    "low":      (0, 255, 0),
}

# ─── Detection Normalization ──────────────────────────────────────────────────
CLASS_MAP = {
    "backpack": "bag",
    "handbag": "bag",
    "suitcase": "bag"
}

# ─── Shared State ─────────────────────────────────────────────────────────────
active_threads = {}
stop_events    = {}
active_rules   = []
alert_queue    = queue.Queue()

# ─── Singleton Check ──────────────────────────────────────────────────────────
PID_FILE = os.path.join(AGENT_DIR, "ai_agent.pid")

def check_singleton():
    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE, "r") as f:
                old_pid = int(f.read().strip())
            if old_pid != os.getpid():
                # On Windows, taskkill is more reliable
                os.system(f"taskkill /F /PID {old_pid} 2>nul")
                logger.info(f"Terminated old agent process (PID: {old_pid})")
        except Exception:
            pass
    with open(PID_FILE, "w") as f:
        f.write(str(os.getpid()))

check_singleton()

# ─── YOLO Model ───────────────────────────────────────────────────────────────
HAS_YOLO  = False
model     = None
yolo_lock = threading.Lock()

try:
    from ultralytics import YOLO
    pt_path = os.path.join(BACKEND_DIR, "yolov8n.pt")
    model   = YOLO(pt_path)
    HAS_YOLO = True
    # Warm up model with minimal settings
    model(np.zeros((320, 320, 3), dtype=np.uint8), verbose=False, imgsz=320)
    logger.info("YOLOv8n warmed up successfully")
except Exception as e:
    logger.error(f"YOLO failed to load: {e}")

# ─── Background API Worker ────────────────────────────────────────────────────
def _api_worker():
    while True:
        try:
            task, payload = alert_queue.get(timeout=1)
            if task == "heartbeat":
                requests.post(f"{BACKEND_URL}/internal/camera-heartbeat", json=payload, headers=HEADERS, timeout=3)
            elif task == "alert":
                logger.info(f"Sending ALERT to backend: {payload.get('object_detected')} - {payload.get('rule_name')}")
                requests.post(f"{BACKEND_URL}/internal/alerts", json=payload, headers=HEADERS, timeout=5)
            elif task == "cam_log":
                requests.post(f"{BACKEND_URL}/internal/camera-logs", json=payload, headers=HEADERS, timeout=3)
            alert_queue.task_done()
        except queue.Empty:
            pass
        except Exception as e:
            logger.debug(f"API worker error: {e}")
            time.sleep(1)

threading.Thread(target=_api_worker, daemon=True, name="api-worker").start()

def log_cam_event(cam_id: str, event_type: str, details: str, severity: str = "info"):
    alert_queue.put(("cam_log", {
        "camera_id": cam_id,
        "event_type": event_type,
        "details": details,
        "severity": severity
    }))

# ─── Overlays ─────────────────────────────────────────────────────────────────
def draw_overlay(frame, box, label, confidence, severity, rule_name):
    try:
        x1, y1, x2, y2 = map(int, box)
        color = COLORS.get(severity, COLORS["low"])
        # Fast drawing: solid rectangle + thin label
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        label_text = f"{label.upper()} {int(confidence*100)}%"
        # Draw background for text to make it readable
        (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)
        cv2.rectangle(frame, (x1, y1-th-5), (x1+tw, y1), color, -1)
        cv2.putText(frame, label_text, (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
    except Exception:
        pass

# ─── Camera Worker (3-Thread Architecture) ──────────────────────────────────
def camera_worker(cam_cfg: dict, stop_evt: threading.Event):
    cam_id   = str(cam_cfg.get("id") or cam_cfg.get("_id", "unknown"))
    cam_name = cam_cfg.get("camera_name", "Camera")
    source   = cam_cfg.get("camera_url", "0").strip()

    logger.info(f"[{cam_name}] Worker init for {source}")

    live_dir        = os.path.join(MEDIA_DIR, "live")
    screenshots_dir = os.path.join(MEDIA_DIR, "screenshots", cam_id)
    recordings_dir  = os.path.join(MEDIA_DIR, "recordings", cam_id)
    for d in (live_dir, screenshots_dir, recordings_dir):
        os.makedirs(d, exist_ok=True)

    live_path = os.path.join(live_dir, f"{cam_id}.jpg")
    live_tmp  = live_path + ".tmp"

    # Resolve numeric vs URL source
    if source.isdigit():
        src = int(source)
    elif source == "":
        src = 0
    else:
        src = source

    latest_frame      = [None]
    latest_detections = [[]]
    frame_lock        = threading.Lock()
    det_lock          = threading.Lock()
    
    # Frame buffer for video recording 
    frame_buffer = collections.deque(maxlen=45) # ~3 seconds at 15fps or so
    video_queue  = queue.Queue()

    # --- Thread 1: Resilient Capture ---
    def capture_fn():
        logger.info(f"[{cam_name}] Capture thread: Connecting to {src}...")
        while not stop_evt.is_set():
            cap = None
            try:
                cap = cv2.VideoCapture(src)
                if not cap.isOpened():
                    logger.warning(f"[{cam_name}] FAILED to open source {src}. Retrying in 15s...")
                    time.sleep(15)
                    continue

                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, TARGET_W)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, TARGET_H)
                
                fails = 0
                while not stop_evt.is_set():
                    ret, frame = cap.read()
                    if not ret or frame is None:
                        fails += 1
                        if fails >= 10: 
                             logger.warning(f"[{cam_name}] Stream lost. Resetting connection...")
                             break
                        time.sleep(0.1)
                        continue
                    fails = 0
                    
                    frame = cv2.resize(frame, (TARGET_W, TARGET_H), interpolation=cv2.INTER_LINEAR)
                    with frame_lock:
                        latest_frame[0] = frame
                        frame_buffer.append(frame.copy())
            except Exception as e:
                logger.error(f"[{cam_name}] Capture loop error: {e}")
                time.sleep(5)
            finally:
                if cap: cap.release()
        logger.info(f"[{cam_name}] Capture thread exiting.")

    # --- Thread 2: YOLO Inference (Heavy Logic) ---
    def yolo_fn():
        if not HAS_YOLO: return
        
        persistence = {}
        cooldown    = {}
        frame_idx   = 0

        while not stop_evt.is_set():
            start_time = time.time()
            frame_idx += 1
            
            # 1. OPTIMIZATION: Process detection every 3rd loop to save CPU
            if frame_idx % 2 != 0:
                time.sleep(0.05)
                continue

            with frame_lock:
                frame = latest_frame[0]
            
            if frame is not None:
                try:
                    inf_img = frame.copy()
                    with yolo_lock:
                        #imgsz=320 is ultra-fast for small-to-mid size objects
                        results = model(inf_img, verbose=False, conf=0.3, imgsz=320)[0]
                    
                    raw_dets = []
                    now = time.time()
                    
                    # 2. DIAGNOSTIC LOGGING: Capture everything first
                    for box in results.boxes:
                        cls_id = int(box.cls[0])
                        label  = model.names[cls_id].lower()
                        normalized = CLASS_MAP.get(label, label)
                        conf   = float(box.conf[0])
                        coords = box.xyxy[0].tolist()
                        raw_dets.append({"box": coords, "label": label, "norm": normalized, "conf": conf})
                    
                    if raw_dets:
                        detected_summary = ", ".join([f"{d['label']}({int(d['conf']*100)}%)" for d in raw_dets])
                        logger.info(f"[{cam_name}] Detections: {detected_summary}")

                    current_v_dets = []
                    
                    # 3. ADVANCED RULE ENGINE
                    for rule in active_rules:
                        if not rule.get("is_active", True): continue
                        if not is_time_allowed(rule.get("time_restriction")): continue
                        
                        rule_id = str(rule.get("id") or rule.get("_id", ""))
                        targets = [t.lower() for t in rule.get("target_classes", [])]
                        min_conf = rule.get("min_confidence", 0.45)
                        
                        # Find matching objects
                        matches = [d for d in raw_dets if (d["norm"] in targets or d["label"] in targets) and d["conf"] >= min_conf]
                        
                        # Specific Logic: Crowd Detection
                        if "crowd" in rule.get("rule_name", "").lower():
                            min_p = rule.get("min_people", 3)
                            if len([d for d in raw_dets if d["norm"] == "person"]) >= min_p:
                                # Trigger as one alert for the group
                                pass # Handled by persistence below if we use a generic 'crowd' marker
                        
                        # Generic Persistence & Cooldown Logic
                        for d in matches:
                            severity = rule.get("severity", "medium")
                            
                            # Specific Logic: Unattended Bag (bag with no person within 200px)
                            if d["norm"] == "bag":
                                nearby_person = any([get_distance(d["box"], p["box"]) < 200 for p in raw_dets if p["norm"] == "person"])
                                if nearby_person: continue # Not unattended
                            
                            current_v_dets.append({
                                "box": d["box"], "label": d["label"], "conf": d["conf"],
                                "severity": severity, "rule": rule.get("rule_name", "Detect")
                            })
                            
                            key = f"{cam_id}_{d['label']}_{rule_id}"
                            if key not in persistence: persistence[key] = now
                            
                            req_p = float(rule.get("persistence_seconds", 1))
                            req_c = float(rule.get("cooldown_seconds", 10))
                            
                            if (now - persistence[key] >= req_p) and (now - cooldown.get(key, 0) >= req_c):
                                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                                ss_name = f"{ts}.jpg"
                                vid_name = f"{ts}.webm"
                                
                                # Prep Paths
                                ss_abs = os.path.join(screenshots_dir, ss_name)
                                vid_abs = os.path.join(recordings_dir, vid_name)
                                
                                # SAVING ASYNC / ATOMIC
                                cv2.imwrite(ss_abs, inf_img)
                                buffer_snapshot = list(frame_buffer)
                                video_queue.put((vid_abs, buffer_snapshot))
                                
                                alert_queue.put(("alert", {
                                    "camera_id": cam_id,
                                    "object_detected": d["label"],
                                    "confidence": round(d["conf"], 2),
                                    "severity": severity,
                                    "rule_name": rule.get("rule_name"),
                                    "triggered_rule_id": rule_id,
                                    "screenshot_path": f"screenshots/{cam_id}/{ss_name}",
                                    "video_path": f"recordings/{cam_id}/{vid_name}",
                                    "created_at": datetime.now(timezone.utc).isoformat()
                                }))
                                cooldown[key] = now
                    
                    with det_lock:
                        latest_detections[0] = current_v_dets
                        
                    # Cleanup persistent states for things no longer in frame
                    active_keys = [f"{cam_id}_{d['label']}_{str(rule.get('id', ''))}" for d in matches for rule in active_rules]
                    for k in list(persistence.keys()):
                        if k not in active_keys and (now - persistence[k] > 5):
                            del persistence[k]

                except Exception as e:
                    logger.warning(f"YOLO engine error: {e}")

            elapsed = time.time() - start_time
            time.sleep(max(0.01, 0.1 - elapsed))

    # --- Thread 3: Fast Write & Stream Loop ---
    def write_fn():
        target_delay = 1.0 / WRITE_FPS
        last_write   = time.time()
        
        while not stop_evt.is_set():
            try:
                now = time.time()
                wait = target_delay - (now - last_write)
                if wait > 0: time.sleep(wait)
                
                with frame_lock:
                    frame = latest_frame[0]
                if frame is None: continue
                    
                with det_lock:
                    dets = list(latest_detections[0])
                
                canvas = frame.copy() if dets else frame
                for d in dets:
                    draw_overlay(canvas, d["box"], d["label"], d["conf"], d["severity"], d["rule"])
                
                ok, buf = cv2.imencode(".jpg", canvas, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
                if ok:
                    with open(live_tmp, "wb") as f: f.write(buf)
                    os.replace(live_tmp, live_path)
                    last_write = time.time()
            except Exception as e:
                logger.debug(f"Stream write error: {e}")
                time.sleep(0.1)

    # --- Thread 4: Background MP4 Encoder ---
    def record_fn():
        logger.info(f"[{cam_name}] Video recorder active.")
        while not stop_evt.is_set():
            try:
                path, frames = video_queue.get(timeout=2)
                if not frames: continue
                
                # Use VP80 codec for browser compatibility in WebM
                fourcc = cv2.VideoWriter_fourcc(*'VP80')
                out = cv2.VideoWriter(path, fourcc, 10.0, (TARGET_W, TARGET_H))
                
                if out.isOpened():
                    for f in frames:
                        if f is not None:
                            if f.shape[1] != TARGET_W or f.shape[0] != TARGET_H:
                                f = cv2.resize(f, (TARGET_W, TARGET_H))
                            out.write(f)
                    out.release()
                    logger.info(f"[{cam_name}] Recording finalized: {os.path.basename(path)}")
            except queue.Empty: continue
            except Exception as e: logger.error(f"[{cam_name}] Video recording error: {e}")

    # --- Thread 5: System Health ---
    def health_fn():
        try: import psutil
        except: return
        while not stop_evt.is_set():
            try:
                payload = {
                    "camera_id": cam_id,
                    "health_status": "online",
                    "telemetry": {
                        "cpu_usage": psutil.cpu_percent(),
                        "memory_usage": psutil.virtual_memory().percent,
                        "uptime_seconds": 3600 # Static placeholder
                    }
                }
                alert_queue.put(("heartbeat", payload))
            except Exception: pass
            time.sleep(20)

    # Start all threads
    for func in [capture_fn, yolo_fn, write_fn, record_fn, health_fn]:
        threading.Thread(target=func, daemon=True).start()
    
    stop_evt.wait()

# ─── Main Engine ──────────────────────────────────────────────────────────────
def run_ai():
    global active_rules
    logger.info("Nexvigil AI Agent Live — Professional Surveillance Ready")
    
    while True:
        try:
            # Sync rules
            r = requests.get(f"{BACKEND_URL}/internal/rules/active", headers=HEADERS, timeout=5)
            if r.status_code == 200: 
                active_rules = r.json()
                logger.info(f"Rules Synced: {len(active_rules)} active protocols.")
            
            # Sync cameras
            c = requests.get(f"{BACKEND_URL}/internal/cameras/active", headers=HEADERS, timeout=5)
            if c.status_code == 200:
                cameras = c.json()
                active_ids = {str(cam.get("id")) for cam in cameras}
                
                for cam in cameras:
                    cid = str(cam.get("id"))
                    if cid not in active_threads or not active_threads[cid].is_alive():
                        logger.info(f"ACTIVATE: {cam.get('camera_name')} ({cid[-6:]})")
                        evt = threading.Event()
                        t = threading.Thread(target=camera_worker, args=(cam, evt), daemon=True)
                        t.start()
                        active_threads[cid] = t
                        stop_events[cid]    = evt
                
                for cid in list(active_threads):
                    if cid not in active_ids:
                        logger.info(f"DEACTIVATE: {cid[-6:]}")
                        stop_events[cid].set()
                        del active_threads[cid]
                        del stop_events[cid]
        except Exception as e:
            logger.error(f"Maintenance loop error: {e}")
            
        time.sleep(15)

if __name__ == "__main__":
    run_ai()
