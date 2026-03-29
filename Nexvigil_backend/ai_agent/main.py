"""
Nexvigil AI Agent — PRO SURVEILLANCE EDITION
Optimized for zero-lag streaming, strict rule enforcement, and reliable video capture.
"""
import os
import sys
import time
import threading
import logging
import requests
import cv2
import numpy as np
from datetime import datetime
import queue
import collections
from dotenv import load_dotenv

# ─── Environment & Paths ──────────────────────────────────────────────────────
sys.stdout.reconfigure(line_buffering=True)
AGENT_DIR   = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(AGENT_DIR)
MEDIA_DIR   = os.path.join(BACKEND_DIR, "uploads")

load_dotenv(os.path.join(AGENT_DIR, ".env"))
BACKEND_URL  = os.getenv("BACKEND_URL", "http://localhost:8000/api/v1")
INTERNAL_KEY = os.getenv("INTERNAL_API_KEY", "change_me_to_a_secure_random_key_for_ai_agent")
HEADERS      = {"x-api-key": INTERNAL_KEY, "Content-Type": "application/json"}

# ─── Environment Options (Requirement 1: Driver Stability) ────────────────────
if os.name == 'nt':
    # Force FFMPEG transport for RTSP/IP cameras
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;udp"
    # Preference for DirectShow over MSMF for standard webcams
    CV_BACKEND_LOCAL = cv2.CAP_DSHOW
else:
    CV_BACKEND_LOCAL = cv2.CAP_ANY

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# ─── Folders ──────────────────────────────────────────────────────────────────
for sub in ["screenshots", "videos", "live"]:
    os.makedirs(os.path.join(MEDIA_DIR, sub), exist_ok=True)

# ─── Configuration (Requirement 1: Load Reduction) ──────────────────────────
TARGET_W       = 640
TARGET_H       = 480
JPEG_QUALITY   = 70
WRITE_FPS      = 10
VIDEO_FPS      = 10.0
RECORD_SEC     = 5
VIDEO_BUFFER   = int(VIDEO_FPS * RECORD_SEC)
SCREENSHOT_INT = 10
PROCESSED_FPS  = 10 # 10 detections per second max

COLORS = {
    "critical": (0, 0, 255),
    "high":     (0, 165, 255),
    "medium":   (0, 255, 255),
    "low":      (0, 255, 0),
}

CLASS_MAP = {"backpack": "bag", "handbag": "bag", "suitcase": "bag"}

# ─── Global State ─────────────────────────────────────────────────────────────
active_threads = {}
stop_events    = {}
active_rules   = []
alert_queue    = queue.Queue()
media_queue    = queue.Queue()    # Requirement: Fully Non-Blocking Disk I/O
global_registry = {}      # {cam_id: {"frame":f, "cfg":c, "v_queue":q, "buffer":b}}
global_det_registry = {}  # {cam_id: [dets]}
registry_lock = threading.Lock()
backend_reachable = threading.Event()
backend_reachable.set()

# ─── YOLO Model (Lazy Loading) ────────────────────────────────────────────────
HAS_YOLO  = False
model     = None
yolo_lock = threading.Lock()

def _load_yolo():
    global model, HAS_YOLO
    if model is not None: return True
    try:
        from ultralytics import YOLO
        pt_path = os.path.join(BACKEND_DIR, "yolov8n.pt")
        model   = YOLO(pt_path)
        HAS_YOLO = True
        # Warmup
        model(np.zeros((320, 320, 3), dtype=np.uint8), verbose=False, imgsz=320)
        logger.info("YOLO Engine Ready")
        return True
    except Exception as e:
        logger.error(f"YOLO Load Failed: {e}")
        return False

# ─── Helpers ──────────────────────────────────────────────────────────────────
def is_time_allowed(restriction):
    if not restriction or not restriction.get("enabled"): return True
    try:
        now = datetime.now().time()
        start = datetime.strptime(restriction["start_time"], "%H:%M").time()
        end = datetime.strptime(restriction["end_time"], "%H:%M").time()
        if start <= end: return start <= now <= end
        return now >= start or now <= end
    except: return True

def get_distance(b1, b2):
    c1 = [(b1[0]+b1[2])/2, (b1[1]+b1[3])/2]
    c2 = [(b2[0]+b2[2])/2, (b2[1]+b2[3])/2]
    return np.sqrt((c1[0]-c2[0])**2 + (c1[1]-c2[1])**2)

def safe_request(method, endpoint, **kwargs):
    url = f"{BACKEND_URL}{endpoint}"
    kwargs.setdefault("headers", HEADERS); kwargs.setdefault("timeout", 10)
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            r = requests.post(url, **kwargs) if method.lower() == "post" else requests.get(url, **kwargs)
            if r.status_code < 400:
                if not backend_reachable.is_set():
                    logger.info("📡 [BACKEND] Reconnected and Synchronized.")
                    backend_reachable.set()
                return r
            logger.warning(f"📡 [BACKEND] Gateway returned {r.status_code} for {endpoint}")
            break
        except Exception as e:
            if attempt < max_retries - 1:
                wait = (attempt + 1) * 2
                time.sleep(wait)
                continue
            
            if backend_reachable.is_set():
                logger.error(f"🚫 [BACKEND] Link severed. Entering fallback mode. ({e})")
                backend_reachable.clear()
            return None
    return None

# ─── API Worker ─────────────────────────────────────────────────────────────
def _api_worker():
    while True:
        try:
            task, payload = alert_queue.get(timeout=2)
            if task == "heartbeat": safe_request("post", "/internal/camera-heartbeat", json=payload)
            elif task == "alert": safe_request("post", "/internal/alerts", json=payload)
            elif task == "cam_log": safe_request("post", "/internal/camera-logs", json=payload)
            alert_queue.task_done()
        except queue.Empty: pass
        except: time.sleep(1)

def _media_worker():
    """Requirement: Non-Blocking Architecture for screenshots and file writes."""
    while True:
        try:
            # Fix: Queue expects a dictionary, not a tuple
            payload = media_queue.get(timeout=2)
            task = payload.get("type") or payload.get("task")
            cid  = payload.get("cid")
            ts   = payload.get("ts")
            f    = payload.get("frame")
            
            if task == "snapshot":
                # Requirement: Fixed interval capture (~6 per minute)
                ss_n = f"{cid}_{ts}_interval.jpg"
                path = os.path.join(MEDIA_DIR, "screenshots", ss_n)
                # Fast JPG save
                if f is not None:
                    cv2.imwrite(path, f, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
                
                # Requirement: Every capture sent to Gmail (pushed as low-severity alert)
                alert_queue.put(("alert", {
                    "camera_id": cid, 
                    "object_detected": "Periodic Capture", 
                    "confidence": 1.0,
                    "severity": "low", 
                    "rule_name": "Active Surveillance", 
                    "screenshot_path": f"screenshots/{ss_n}",
                    "cam_name": payload.get("cam_name", "System")
                }))

            elif task == "alert":
                ss_n = f"{cid}_{ts}_alert.jpg"
                path = os.path.join(MEDIA_DIR, "screenshots", ss_n)
                if f is not None:
                    cv2.imwrite(path, f, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
                
                # Enrich and push to API
                a_data = payload.get("alert_data")
                a_data["screenshot_path"] = f"screenshots/{ss_n}"
                alert_queue.put(("alert", a_data))

            media_queue.task_done()
        except queue.Empty: pass
        except Exception as e:
            logger.error(f"Media Worker Error: {e}")
            time.sleep(1)

threading.Thread(target=_api_worker, daemon=True).start()
threading.Thread(target=_media_worker, daemon=True).start()

# ─── YOLO Manager ────────────────────────────────────────────────────────────
def yolo_manager():
    logger.info("Central YOLO Engine Starting...")
    if not _load_yolo():
        logger.error("Failed to initialize YOLO. Manager exiting.")
        return
    
    logger.info("Central YOLO Engine Active")
    # Requirement: Persistence, Cooldown, and Fresh Frame Tracking
    persistence, cooldown, last_interval_ss, processed_frame_ids = {}, {}, {}, {}

    while True:
        try:
            now = time.time()
            with registry_lock: targets = list(global_registry.items())
            if not targets: time.sleep(0.01); continue

            frames, ids, inf_frames = [], [], []
            for cid, info in targets:
                f = info["frame"]
                fid = info.get("frame_id", 0)
                
                # Requirement: Skip if no fresh frame from camera
                if f is None or fid == processed_frame_ids.get(cid):
                    continue

                ids.append(cid)
                # Requirement: Deep copy for safety
                f_copy = f.copy()
                frames.append(f_copy)
                
                # Requirement: Use specific inference size for speed
                inf_frames.append(cv2.resize(f_copy, (256, 256)))
                processed_frame_ids[cid] = fid
                
                # Requirement: Fixed 10s Interval Capture (Fresh Frame)
                if now - last_interval_ss.get(cid, 0) >= SCREENSHOT_INT:
                    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                    media_queue.put({
                        "type": "snapshot", "cid": cid, "ts": ts, 
                        "frame": f_copy.copy(), "cam_name": info["cfg"].get("camera_name")
                    })
                    last_interval_ss[cid] = now
            
            if not frames: time.sleep(0.01); continue

            # Requirement: Accurate Bounding Boxes (CRITICAL)
            # Pass original frames (640x480) to the model. 
            # YOLO internally handles letterboxing and SCALES coordinates back to 
            # the original frame size automatically for perfect alignment.
            with yolo_lock: batch_results = model(frames, verbose=False, conf=0.3, imgsz=256)

            for i, results in enumerate(batch_results):
                cid = ids[i]; cfg = global_registry[cid]["cfg"]; inf_img = frames[i]
                found = []
                for box in results.boxes:
                    lbl = model.names[int(box.cls[0])].lower()
                    conf = float(box.conf[0])
                    # Requirement: Accurate Positioning (No Manual Scaling)
                    # Coordinates are now automatically scaled by YOLO back to original resolution.
                    coords = box.xyxy[0].tolist() 
                    
                    norm = CLASS_MAP.get(lbl, lbl)
                    for rule in active_rules:
                        if not rule.get("is_active", True): continue
                        if not is_time_allowed(rule.get("time_restriction")): continue
                        tc = [t.lower() for t in rule.get("target_classes", [])]
                        if (norm in tc or lbl in tc) and conf >= rule.get("min_confidence", 0.45):
                            found.append({"box": coords, "label": lbl, "conf": conf, "rule": rule, "rid": str(rule.get("id") or rule.get("_id", ""))})

                final_dets = []
                for m in found:
                    rule = m["rule"]; rid = m["rid"]
                    if m["label"] == "bag":
                        # Person proximity logic
                        if any([get_distance(m["box"], b.xyxy[0].tolist()) < 200 for b in results.boxes if model.names[int(b.cls[0])].lower() == "person"]): 
                            continue
                    
                    final_dets.append({"box": m["box"], "label": m["label"], "conf": m["conf"], "severity": rule.get("severity", "medium"), "rule": rule.get("rule_name")})
                    
                    key = f"{cid}_{m['label']}_{rid}"
                    if key not in persistence: persistence[key] = now
                    if (now - persistence[key] >= float(rule.get("persistence_seconds", 1))) and (now - cooldown.get(key, 0) >= float(rule.get("cooldown_seconds", 10))):
                        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                        vid_n = f"{cid}_{ts}_alert.mp4"
                        
                        # Requirement: OFF-LOAD DISK WRITE (Fresh Copy)
                        media_queue.put({
                            "task": "alert", "cid": cid, "ts": ts, "frame": inf_img.copy(),
                            "alert_data": {
                                "camera_id": cid, "object_detected": m["label"], "confidence": round(m["conf"], 2),
                                "severity": rule.get("severity", "medium"), "rule_name": rule.get("rule_name"),
                                "triggered_rule_id": rid, "video_path": f"videos/{vid_n}", 
                                "cam_name": cfg.get("camera_name", "Unknown")
                            }
                        })
                        
                        global_registry[cid]["v_queue"].put((os.path.join(MEDIA_DIR, "videos", vid_n), list(global_registry[cid]["buffer"])))
                        cooldown[key] = now
                        
                with registry_lock: global_det_registry[cid] = final_dets
        except Exception as e:
            logger.error(f"YOLO Manager Error: {e}")
        time.sleep(0.01)

threading.Thread(target=yolo_manager, daemon=True).start()

# ─── Camera Worker ───────────────────────────────────────────────────────────
def camera_worker(cam_cfg: dict, stop_evt: threading.Event):
    cid      = str(cam_cfg.get("id") or cam_cfg.get("_id", "unknown"))
    cam_name = cam_cfg.get("camera_name", "Camera")
    source   = cam_cfg.get("camera_url", "0").strip()
    
    live_path = os.path.join(MEDIA_DIR, "live", f"{cid}.jpg"); live_tmp = live_path + ".tmp"
    latest_frame = [None]
    frame_buffer = collections.deque(maxlen=VIDEO_BUFFER)
    video_queue  = queue.Queue()
    frame_lock   = threading.Lock()

    def capture_fn():
        frame_counter = 0
        while not stop_evt.is_set():
            try: base_src = int(source) if source.isdigit() else source
            except: base_src = source
            
            try_list = [base_src]
            if base_src != 0: try_list.extend([0, 1, 2])
            
            worked = False
            for s in try_list:
                if stop_evt.is_set(): break
                local = isinstance(s, int) or str(s).isdigit()
                backend = CV_BACKEND_LOCAL if local else cv2.CAP_ANY
                
                cap = None
                try:
                    cap = cv2.VideoCapture(int(s) if local else s, backend)
                    if not cap.isOpened() and local:
                        # If DSHOW failed, try standard fallback
                        cap.release()
                        cap = cv2.VideoCapture(int(s))
                except Exception as e:
                    logger.warning(f"[{cam_name}] Driver Exception for source {s}: {e}")
                    if cap: cap.release()
                    continue

                if cap and cap.isOpened():
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    if local: cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280); cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
                    logger.info(f"📹 [{cam_name}] Captured via Source {s}")
                    drops = 0
                    while not stop_evt.is_set():
                        # Requirement 2: FPS Control (Cap at ~15 FPS)
                        start_time = time.time()
                        
                        ret, frame = cap.read()
                        if not ret or frame is None:
                            drops += 1
                            # Requirement 8: If frame fails, clear registry to avoid 'Ghost Detections'
                            with registry_lock:
                                if cid in global_registry: global_registry[cid]["frame"] = None
                            
                            if drops > 10: break
                            time.sleep(0.1); continue
                        
                        drops = 0
                        frame_counter += 1
                        # Requirement 1: Resolution Optimization
                        frame = cv2.resize(frame, (TARGET_W, TARGET_H))
                        
                        with frame_lock:
                            latest_frame[0] = frame
                            frame_buffer.append(frame.copy())
                        with registry_lock:
                            global_registry[cid] = {"frame": frame, "cfg": cam_cfg, "v_queue": video_queue, "buffer": frame_buffer}
                        
                        # Throttle logic
                        elapsed = time.time() - start_time
                        wait = (1.0 / 15.0) - elapsed
                        if wait > 0: time.sleep(wait)
                        
                    cap.release()
                    # Final cleanup on exit
                    with registry_lock:
                         if cid in global_registry: del global_registry[cid]
                         if cid in global_det_registry: del global_det_registry[cid]
                    if worked: break
                else: cap.release(); time.sleep(1)
            if not worked: time.sleep(10)

    def write_fn():
        last = 0
        while not stop_evt.is_set():
            now = time.time()
            # Requirement: Smooth Live Streaming (Increase FPS from 2 to 20)
            if now - last < 0.05: 
                time.sleep(0.01)
                continue
            try:
                with frame_lock: f = latest_frame[0]
                if f is None: continue
                with registry_lock: dets = list(global_det_registry.get(cid, []))
                cv = f.copy()
                for d in dets:
                    x1, y1, x2, y2 = map(int, d["box"])
                    clr = COLORS.get(d["severity"], COLORS["low"])
                    cv2.rectangle(cv, (x1, y1), (x2, y2), clr, 2)
                    cv2.putText(cv, f"{d['label']} {int(d['conf']*100)}%", (x1, y1-5), 0, 0.4, clr, 1)
                ok, b = cv2.imencode(".jpg", cv, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
                if ok:
                    with open(live_tmp, "wb") as f_out: f_out.write(b)
                    os.replace(live_tmp, live_path)
                last = now
            except: pass
            time.sleep(0.01)

    def record_fn():
        """
        Dedicated worker for video writing to ensure the detection loop remains zero-lag.
        Requirement: Stability, Error Handling, and Codec Fix.
        """
        while not stop_evt.is_set():
            try:
                # 1. Fetch recording task
                vid_path, buffer = video_queue.get(timeout=2)
                if not buffer or len(buffer) < 5:
                    logger.warning(f"⚠️ [{cam_name}] Recording skipped: Insufficient frames in buffer.")
                    continue

                logger.info(f"🎞️ [{cam_name}] Initializing video record: {os.path.basename(vid_path)}")
                
                # 2. VideoWriter Setup (Requirement: Browser Playability)
                # Primary: 'avc1' (H.264) - Best for browsers.
                # Fallback: 'mp4v' or 'XVID' for internal stability.
                try:
                    fourcc = cv2.VideoWriter_fourcc(*'avc1')
                    out = cv2.VideoWriter(vid_path, fourcc, VIDEO_FPS, (TARGET_W, TARGET_H))
                    if not out.isOpened():
                         raise Exception("avc1 failed")
                except:
                    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                    out = cv2.VideoWriter(vid_path, fourcc, VIDEO_FPS, (TARGET_W, TARGET_H))
                
                if not out.isOpened():
                    logger.error(f"❌ [{cam_name}] Failed to initialize VideoWriter with mp4v (Second fallback).")
                    fourcc = cv2.VideoWriter_fourcc(*'XVID')
                    out = cv2.VideoWriter(vid_path, fourcc, VIDEO_FPS, (TARGET_W, TARGET_H))
                    
                if not out.isOpened():
                    logger.error(f"❌ [{cam_name}] Critical: All VideoWriter codecs failed.")
                    continue

                # 3. Writing Frames (Requirement: Track frames and performance)
                # NOTE: yolo_lock REMOVED here to prevent detection loop from freezing during I/O
                frames_written = 0
                for f in buffer:
                    if f is not None:
                        try:
                            # Requirement: Resize to stable resolution
                            if f.shape[1] != TARGET_W or f.shape[0] != TARGET_H:
                                f = cv2.resize(f, (TARGET_W, TARGET_H))
                            out.write(f)
                            frames_written += 1
                        except Exception as e:
                            logger.error(f"⚠️ [{cam_name}] Frame write error: {e}")
                
                out.release()

                # 4. Final Validation (Requirement: Do not mark saved if empty)
                if frames_written > 0:
                    logger.info(f"✅ [{cam_name}] Successfully Recorded: {os.path.basename(vid_path)} [{frames_written} frames]")
                else:
                    logger.error(f"❌ [{cam_name}] Recording failed: No frames were successfully written.")
                    if os.path.exists(vid_path):
                        os.remove(vid_path) # Cleanup corrupted/empty file

            except queue.Empty:
                pass
            except Exception as e:
                logger.error(f"❌ [{cam_name}] Recording Thread Error: {e}")

    for f in [capture_fn, write_fn, record_fn]: threading.Thread(target=f, daemon=True).start()
    while not stop_evt.is_set(): time.sleep(1)

def run_ai():
    global active_rules
    lck = os.path.join(BACKEND_DIR, "ai_agent.lock")
    if os.path.exists(lck):
        try:
            with open(lck, "r") as f: pid = int(f.read().strip())
            import psutil
            if psutil.pid_exists(pid):
                logger.error(f"Already running (PID {pid})."); return
        except: pass
    with open(lck, "w") as f: f.write(str(os.getpid()))
    logger.info("NexVigil AI Agent — PRO STARTUP")
    
    while True:
        try:
            res = safe_request("get", "/internal/rules/active")
            if res and res.status_code == 200: active_rules = res.json()
            res = safe_request("get", "/internal/cameras/active")
            if res and res.status_code == 200:
                cams = res.json(); aids = {str(c.get("id") or c.get("_id")) for c in cams}
                for c in cams:
                    idi = str(c.get("id") or c.get("_id"))
                    if idi not in active_threads or not active_threads[idi].is_alive():
                        evt = threading.Event()
                        t = threading.Thread(target=camera_worker, args=(c, evt), daemon=True)
                        t.start()
                        active_threads[idi], stop_events[idi] = t, evt
                for idi in list(active_threads):
                    if idi not in aids:
                        stop_events[idi].set(); del active_threads[idi], stop_events[idi]
        except: pass
        time.sleep(15)

if __name__ == "__main__":
    run_ai()
