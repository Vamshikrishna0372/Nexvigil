"""
Nexvigil AI Agent — HYPER-STABLE EDITION
Resolves: Coordinate mismatch, camera blinking, and failed detections.
"""
import os, sys, time, threading, logging, requests, cv2, queue, collections
import numpy as np
from datetime import datetime
from dotenv import load_dotenv

# ─── Environment & Paths ──────────────────────────────────────────────────────
sys.stdout.reconfigure(line_buffering=True)
AGENT_DIR   = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(AGENT_DIR)
MEDIA_DIR   = os.path.join(BACKEND_DIR, "uploads")
for sub in ["screenshots", "videos", "live"]:
    os.makedirs(os.path.join(MEDIA_DIR, sub), exist_ok=True)

load_dotenv(os.path.join(AGENT_DIR, ".env"))
BACKEND_URL  = os.getenv("BACKEND_URL", "http://127.0.0.1:8000/api/v1")
INTERNAL_KEY = os.getenv("INTERNAL_API_KEY", "change_me_to_a_secure_random_key_for_ai_agent")
HEADERS      = {"x-api-key": INTERNAL_KEY, "Content-Type": "application/json"}

# Backend Options
if os.name == 'nt':
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;udp"
    CV_BACKEND_LOCAL = cv2.CAP_DSHOW
else:
    CV_BACKEND_LOCAL = cv2.CAP_ANY

# Logging
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger(__name__)

# Config
TARGET_W, TARGET_H = 640, 480  # Standardized Resolution for AI/Live
VIDEO_FPS, RECORD_SEC = 10.0, 5
VIDEO_BUFFER = int(VIDEO_FPS * RECORD_SEC)
SCREENSHOT_INT = 10

COLORS = {"critical": (0, 0, 255), "high": (0, 165, 255), "medium": (0, 255, 255), "low": (0, 255, 0)}
CLASS_MAP = {"backpack": "bag", "handbag": "bag", "suitcase": "bag"}

# Global State
global_registry     = {}  # {cam_id: {"frame":f, "fid":i, "cfg":c, "buffer":b, "v_queue":q}}
global_det_registry = {}  # {cam_id: [dets]}
active_rules        = []  
global_workers      = {}
registry_lock       = threading.Lock()
yolo_lock           = threading.Lock()
media_queue         = queue.Queue()
model               = None

# ─── Core Workers ─────────────────────────────────────────────────────────────
def _load_yolo():
    global model
    if model is not None: return True
    try:
        from ultralytics import YOLO
        pt_path = os.path.join(BACKEND_DIR, "yolov8n.pt")
        model = YOLO(pt_path)
        model(np.zeros((320, 320, 3), dtype=np.uint8), verbose=False, imgsz=320)
        logger.info("YOLO Engine Ready.")
        return True
    except Exception as e:
        logger.error(f"YOLO Load Failed: {e}"); return False

def is_time_allowed(restriction):
    if not restriction or not restriction.get("enabled"): return True
    try:
        now = datetime.now().time()
        start = datetime.strptime(restriction["start_time"], "%H:%M").time()
        end = datetime.strptime(restriction["end_time"], "%H:%M").time()
        return start <= now <= end if start <= end else now >= start or now <= end
    except: return True

def safe_request(method, endpoint, **kwargs):
    url = f"{BACKEND_URL}{endpoint}"
    kwargs.setdefault("headers", HEADERS); kwargs.setdefault("timeout", 10)
    try: return requests.post(url, **kwargs) if method.lower() == "post" else requests.get(url, **kwargs)
    except: return None

def _media_worker():
    while True:
        try:
            p = media_queue.get()
            t, cid, ts, f = p.get("task"), p.get("cid"), p.get("ts"), p.get("frame")
            if f is not None:
                if t == "snapshot":
                    cv2.imwrite(os.path.join(MEDIA_DIR, "screenshots", f"{cid}_{ts}_interval.jpg"), f)
                elif t == "alert":
                    ss_n = f"{cid}_{ts}_alert.jpg"; p_out = os.path.join(MEDIA_DIR, "screenshots", ss_n)
                    cv2.imwrite(p_out, f)
                    a_data = p.get("alert_data"); a_data["screenshot_path"] = f"screenshots/{ss_n}"
                    safe_request("post", "/internal/alerts", json=a_data)
            media_queue.task_done()
        except: time.sleep(1)

def video_recorder(v_queue, stop_evt):
    """Requirement: Guaranteed browser-playable video alerts."""
    while not stop_evt.is_set():
        try:
            path, buffer = v_queue.get(timeout=2)
            if not buffer or len(buffer) < 5: 
                logger.warning("⚠️ Recording skipped: Buffer depleted.")
                continue

            logger.info(f"🎞️ Recording Video: {os.path.basename(path)}")
            # Try avc1 (H.264 for browsers) -> fallback to mp4v -> XVID
            fourcc = cv2.VideoWriter_fourcc(*'avc1')
            out = cv2.VideoWriter(path, fourcc, VIDEO_FPS, (TARGET_W, TARGET_H))
            
            if not out.isOpened():
                logger.warning("⚠️ avc1 failed. Falling back to libx264.")
                fourcc = cv2.VideoWriter_fourcc(*'x264')
                out = cv2.VideoWriter(path, fourcc, VIDEO_FPS, (TARGET_W, TARGET_H))
                
                if not out.isOpened():
                    logger.warning("⚠️ x264 failed. Falling back to mp4v.")
                    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                    out = cv2.VideoWriter(path, fourcc, VIDEO_FPS, (TARGET_W, TARGET_H))
            
            if out.isOpened():
                cnt = 0
                for f in buffer:
                    if f is not None:
                        if f.shape[1] != TARGET_W or f.shape[0] != TARGET_H:
                            f = cv2.resize(f, (TARGET_W, TARGET_H))
                        out.write(f)
                        cnt += 1
                out.release()
                logger.info(f"✅ Video Saved: {os.path.basename(path)} ({cnt} frames)")
            else:
                logger.error(f"❌ VideoWriter failed to open for {path}")
            
            v_queue.task_done()
        except queue.Empty: pass
        except Exception as e:
            logger.error(f"❌ Video Record Error: {e}")

# ─── YOLO Manager (CENTRALIZED) ────────────────────────────────────────────────
def yolo_manager():
    global model, active_rules
    if not _load_yolo(): return
    
    # Face Detection Fallback (Haar Cascade)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    last_processed = {}; last_ss = {}; persistence = {}; cooldown = {}
    
    while True:
        try:
            now = time.time()
            with registry_lock: cameras = list(global_registry.items())
            if not cameras: time.sleep(0.1); continue

            for cid, info in cameras:
                frame = info.get("frame"); fid = info.get("fid", 0)
                if frame is None or fid == last_processed.get(cid): continue
                
                # Inference
                with yolo_lock: results = model(frame, verbose=False, imgsz=TARGET_W, conf=0.15)
                res = results[0]; last_processed[cid] = fid
                
                visual_detections = []
                detected_labels = [] # Debug tracking
                
                # 2. Process Detected Objects
                for b in res.boxes:
                    coords = b.xyxy[0].tolist(); conf = float(b.conf[0]); label = model.names[int(b.cls[0])].lower()
                    entry = {"box": coords, "label": label, "conf": conf, "severity": "low"}
                    
                    if conf > 0.2:
                        norm = CLASS_MAP.get(label, label); triggered = None
                        for rule in active_rules:
                            if not rule.get("is_active", True) or not is_time_allowed(rule.get("time_restriction")): continue
                            targets = [t.lower() for t in rule.get("target_classes", [])]
                            if (norm in targets or label in targets) and conf >= float(rule.get("min_confidence", 0.2)):
                                triggered = rule; 
                                # Requirement 4: ALERT PRIORITY (CRITICAL LABEL)
                                entry["severity"] = "critical" if label == "person" else "warning"
                                break
                        
                        # Requirement 2 & 3: Detection-Based Trigger (Strict 10s Interval, NO periodic capture)
                        if triggered:
                            rid = str(triggered.get("id") or triggered.get("_id", "")); key = f"{cid}_{label}_{rid}"
                            if key not in persistence: persistence[key] = now
                            
                            # Standard interval of 10s forced by requirement 5
                            interval = 10.0 # Strict 10s capture interval when active
                            if (now - persistence[key] >= float(triggered.get("persistence_seconds", 1))) and \
                               (now - cooldown.get(key, 0) >= interval):
                                
                                alert_name = label.capitalize()
                                
                                # Requirement 8: FAIL-SAFE CHECK
                                if "periodic" in alert_name.lower() or alert_name == "Periodic Capture":
                                    raise ValueError("CRITICAL ERROR: 'Periodic Capture' label illegally generated.")
                                
                                logger.info(f"🚨 ALERT: {alert_name} Detected on {info['cfg']['camera_name']}")
                                ts = datetime.now().strftime("%Y%m%d_%H%M%S"); vid_n = f"{cid}_{ts}_{label}.mp4"
                                
                                # Alert Data - Purely detection driven
                                a_data = {
                                    "camera_id": cid,
                                    "object_detected": label,
                                    "confidence": round(conf, 2),
                                    "severity": entry["severity"],
                                    "rule_name": f"{alert_name} Detected", # Overriding generic rule name with specific detection
                                    "detection_type": label,
                                    "triggered_rule_id": rid,
                                    "video_path": f"videos/{vid_n}",
                                    "cam_name": info['cfg']['camera_name']
                                }
                                
                                # Queue media task (Atomic: captures ONE frame and triggers Alert)
                                media_queue.put({
                                    "task": "alert", 
                                    "cid": cid, 
                                    "ts": ts, 
                                    "frame": frame.copy(),
                                    "alert_data": a_data
                                })
                                
                                # Queue video record
                                info["v_queue"].put((os.path.join(MEDIA_DIR, "videos", vid_n), list(info["buffer"])))
                                cooldown[key] = now
                                detected_labels.append(label)
                        else:
                            # Reset persistence if rule no longer met for this specific class
                            rid_key = f"{cid}_{label}"
                            if rid_key in persistence: del persistence[rid_key]
                    visual_detections.append(entry)
                
                # Diagnostic Tracking (Requirement 8)
                if len(detected_labels) > 0:
                    logger.info(f"   ↳ Detected classes processed: {list(set(detected_labels))}")
                
                # Diagnostic Scanning Log (No activity -> Scanning)
                if len(visual_detections) == 0:
                    if fid % 60 == 0: logger.info(f"📡 [CAM {cid[:6]}] Scanning...")
                
                with registry_lock: global_det_registry[cid] = visual_detections

        except: time.sleep(0.1)
        time.sleep(0.01)

# ─── Camera Instance ──────────────────────────────────────────────────────────
def camera_worker(cam_cfg: dict, stop_evt: threading.Event):
    cid, name, src = str(cam_cfg.get("id") or cam_cfg.get("_id")), cam_cfg.get("camera_name"), cam_cfg.get("camera_url", "0").strip()
    live_p = os.path.join(MEDIA_DIR, "live", f"{cid}.jpg"); live_t = live_p + ".tmp"
    latest, buffer, v_queue = [None], collections.deque(maxlen=VIDEO_BUFFER), queue.Queue()
    f_lock = threading.Lock()

    def capture():
        cnt = 0
        while not stop_evt.is_set():
            c = cv2.VideoCapture(int(src) if src.isdigit() else src, CV_BACKEND_LOCAL)
            if c.isOpened():
                logger.info(f"📹 [{name}] Connected")
                while not stop_evt.is_set():
                    r, f = c.read()
                    if not r or f is None: break
                    f = cv2.resize(f, (TARGET_W, TARGET_H)); cnt += 1
                    with f_lock: latest[0] = f; buffer.append(f.copy())
                    with registry_lock: global_registry[cid] = {"frame":f, "fid":cnt, "cfg":cam_cfg, "buffer":buffer, "v_queue":v_queue}
                    time.sleep(1/12.0)
                c.release()
            logger.warning(f"⚠️ [{name}] Signal lost. Retrying in 5s..."); time.sleep(5)

    def write():
        while not stop_evt.is_set():
            try:
                with f_lock: f = latest[0]
                if f is None: time.sleep(0.1); continue
                with registry_lock: dets = list(global_det_registry.get(cid, []))
                cv = f.copy()
                for d in dets:
                    x1, y1, x2, y2 = map(int, d["box"]); clr = COLORS.get(d["severity"], COLORS["low"])
                    cv2.rectangle(cv, (x1, y1), (x2, y2), clr, 2)
                    cv2.putText(cv, f"{d['label']} {int(d['conf']*100)}%", (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, clr, 2)
                ok, b = cv2.imencode(".jpg", cv, [cv2.IMWRITE_JPEG_QUALITY, 70])
                if ok:
                    with open(live_t, "wb") as fo: fo.write(b)
                    if os.path.exists(live_t): os.replace(live_t, live_p)
            except: pass
            time.sleep(0.1)

    for f in [capture, write]: threading.Thread(target=f, daemon=True).start()
    threading.Thread(target=video_recorder, args=(v_queue, stop_evt), daemon=True).start()

# ─── Main Controller ──────────────────────────────────────────────────────────
def run_ai():
    global active_rules
    threading.Thread(target=yolo_manager, daemon=True).start()
    threading.Thread(target=_media_worker, daemon=True).start()
    while True:
        try:
            r = safe_request("get", "/internal/rules/active")
            if r and r.status_code == 200: active_rules = r.json(); logger.info(f"🔄 Rules Synced: {len(active_rules)}")
            r = safe_request("get", "/internal/cameras/active")
            if r and r.status_code == 200:
                cams = r.json(); aids = {str(c.get("id") or c.get("_id")) for c in cams}
                for c in cams:
                    idi = str(c.get("id") or c.get("_id"))
                    if idi not in global_workers:
                        evt = threading.Event(); t = threading.Thread(target=camera_worker, args=(c, evt), daemon=True)
                        t.start(); global_workers[idi] = (t, evt)
                for idi in list(global_workers):
                    if idi not in aids: global_workers[idi][1].set(); del global_workers[idi]
        except: pass
        time.sleep(20)

if __name__ == "__main__":
    run_ai()
