from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, Response, StreamingResponse
import asyncio
from app.core.config import settings
import pathlib
from typing import List, Optional
from app.api import deps
from app.schemas.camera import CameraCreate, CameraUpdate, CameraResponse, CameraBase
from app.schemas.response import BaseResponse
from app.services.camera_service import camera_service
from app.schemas.user import UserResponse

router = APIRouter()

from app.utils import serialize_mongo

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_camera(
    camera_in: CameraCreate,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Create a new camera.
    """
    camera = await camera_service.create_camera(camera_in, current_user)
    return BaseResponse(
        success=True,
        message="Camera created successfully",
        data=serialize_mongo(camera)
    )

@router.get("/")
async def read_cameras(
    skip: int = 0,
    limit: int = 20,
    status_filter: Optional[str] = None,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Get list of cameras.
    """
    cameras = await camera_service.get_cameras(current_user, skip=skip, limit=limit, status_filter=status_filter)
    return BaseResponse(
        success=True,
        message="Cameras retrieved successfully",
        data=serialize_mongo(cameras)
    )

@router.get("/{camera_id}")
async def read_camera(
    camera_id: str,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Get a specific camera.
    """
    camera = await camera_service.get_camera_by_id(camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
        
    # Check ownership
    if current_user.role != "admin" and camera["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this camera")
        
    return BaseResponse(
        success=True,
        message="Camera details retrieved",
        data=serialize_mongo(camera)
    )

@router.put("/{camera_id}")
async def update_camera(
    camera_id: str,
    camera_in: CameraUpdate,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Update a camera.
    """
    camera = await camera_service.update_camera(camera_id, camera_in, current_user)
    return BaseResponse(
        success=True,
        message="Camera updated successfully",
        data=serialize_mongo(camera)
    )

@router.delete("/{camera_id}", status_code=status.HTTP_200_OK)
async def delete_camera(
    camera_id: str,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Delete a camera.
    """
    await camera_service.delete_camera(camera_id, current_user)
    return BaseResponse(
        success=True,
        message="Camera deleted successfully"
    )

@router.patch("/{camera_id}/status")
async def toggle_camera_status(
    camera_id: str,
    active: bool,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Toggle camera active/inactive status.
    """
    # Simply reuse update logic, passing partial update
    status_str = "active" if active else "inactive"
    update = CameraUpdate(status=status_str)
    camera = await camera_service.update_camera(camera_id, update, current_user)
    return BaseResponse(
        success=True,
        message=f"Camera status updated to {status_str}",
        data=serialize_mongo(camera)
    )

@router.patch("/{camera_id}/health", status_code=status.HTTP_200_OK)
async def update_camera_health_patch(
    camera_id: str,
    health_status: str,
    authorized: bool = Depends(deps.validate_internal_api_key)
):
    """
    Update camera health status (for AI Agent).
    """
    await camera_service.update_health(camera_id, health_status)
    return {"status": "ok", "message": "Health updated"}

@router.get("/{camera_id}/logs")
async def get_camera_logs(
    camera_id: str,
    limit: int = 50,
    current_user: UserResponse = Depends(deps.get_current_active_user)
):
    """
    Get real logs for a specific camera.
    """
    camera = await camera_service.get_camera_by_id(camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
        
    if current_user.role != "admin" and camera["owner_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    from app.services.camera_log_service import camera_log_service
    logs = await camera_log_service.get_logs(camera_id, limit)
    return BaseResponse(
        success=True,
        message="Logs retrieved",
        data=logs
    )

import logging
import os
logger = logging.getLogger(__name__)

# Resolve media directory absolutely from the backend root.
# cameras.py is at: Nexvigil_backend/app/api/v1/endpoints/cameras.py
# parents[4] = Nexvigil_backend/
_BACKEND_ROOT = pathlib.Path(__file__).resolve().parents[4]
_MEDIA_ABS = _BACKEND_ROOT / settings.MEDIA_DIR  # Always correct regardless of CWD



def _resolve_live_frame(camera_id: str) -> pathlib.Path | None:
    """Return the live frame path if it exists and is a valid JPEG (>100 bytes)."""
    candidate = _MEDIA_ABS / "live" / f"{camera_id}.jpg"
    if candidate.exists() and candidate.stat().st_size > 100:
        return candidate
    # Also check relative path (works when CWD = Nexvigil_backend)
    rel = pathlib.Path(settings.MEDIA_DIR) / "live" / f"{camera_id}.jpg"
    if rel.exists() and rel.stat().st_size > 100:
        return rel
    return None


def _make_placeholder_jpeg(camera_id: str) -> bytes:
    """
    Generate a minimal gray JPEG placeholder (640x480) with 'Stream Starting...' text.
    Uses only stdlib — no PIL dependency. Returns a hard-coded tiny JPEG if cv2 fails.
    """
    try:
        import cv2
        import numpy as np
        img = np.full((480, 640, 3), 30, dtype=np.uint8)  # Dark gray background
        # Draw text
        text1 = "Stream Starting..."
        text2 = f"Camera: {camera_id[-6:]}"
        text3 = "Waiting for AI Agent frames"
        cv2.putText(img, text1, (160, 210), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (180, 180, 180), 2)
        cv2.putText(img, text2, (200, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (120, 120, 120), 1)
        cv2.putText(img, text3, (100, 310), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (100, 100, 100), 1)
        _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 60])
        return buf.tobytes()
    except Exception:
        # Minimal 1x1 gray JPEG fallback (valid JPEG bytes)
        return bytes([
            0xFF,0xD8,0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46,0x00,0x01,0x01,0x00,0x00,0x01,
            0x00,0x01,0x00,0x00,0xFF,0xDB,0x00,0x43,0x00,0x08,0x06,0x06,0x07,0x06,0x05,0x08,
            0x07,0x07,0x07,0x09,0x09,0x08,0x0A,0x0C,0x14,0x0D,0x0C,0x0B,0x0B,0x0C,0x19,0x12,
            0x13,0x0F,0x14,0x1D,0x1A,0x1F,0x1E,0x1D,0x1A,0x1C,0x1C,0x20,0x24,0x2E,0x27,0x20,
            0x22,0x2C,0x23,0x1C,0x1C,0x28,0x37,0x29,0x2C,0x30,0x31,0x34,0x34,0x34,0x1F,0x27,
            0x39,0x3D,0x38,0x32,0x3C,0x2E,0x33,0x34,0x32,0xFF,0xC0,0x00,0x0B,0x08,0x00,0x01,
            0x00,0x01,0x01,0x01,0x11,0x00,0xFF,0xC4,0x00,0x1F,0x00,0x00,0x01,0x05,0x01,0x01,
            0x01,0x01,0x01,0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x01,0x02,0x03,0x04,
            0x05,0x06,0x07,0x08,0x09,0x0A,0x0B,0xFF,0xC4,0x00,0xB5,0x10,0x00,0x02,0x01,0x03,
            0x03,0x02,0x04,0x03,0x05,0x05,0x04,0x04,0x00,0x00,0x01,0x7D,0x01,0x02,0x03,0x00,
            0x04,0x11,0x05,0x12,0x21,0x31,0x41,0x06,0x13,0x51,0x61,0x07,0x22,0x71,0x14,0x32,
            0x81,0x91,0xA1,0x08,0x23,0x42,0xB1,0xC1,0x15,0x52,0xD1,0xF0,0x24,0x33,0x62,0x72,
            0x82,0x09,0x0A,0x16,0x17,0x18,0x19,0x1A,0x25,0x26,0x27,0x28,0x29,0x2A,0x34,0x35,
            0x36,0x37,0x38,0x39,0x3A,0x43,0x44,0x45,0x46,0x47,0x48,0x49,0x4A,0x53,0x54,0x55,
            0x56,0x57,0x58,0x59,0x5A,0x63,0x64,0x65,0x66,0x67,0x68,0x69,0x6A,0x73,0x74,0x75,
            0x76,0x77,0x78,0x79,0x7A,0x83,0x84,0x85,0x86,0x87,0x88,0x89,0x8A,0x92,0x93,0x94,
            0x95,0x96,0x97,0x98,0x99,0x9A,0xA2,0xA3,0xA4,0xA5,0xA6,0xA7,0xA8,0xA9,0xAA,0xB2,
            0xB3,0xB4,0xB5,0xB6,0xB7,0xB8,0xB9,0xBA,0xC2,0xC3,0xC4,0xC5,0xC6,0xC7,0xC8,0xC9,
            0xCA,0xD2,0xD3,0xD4,0xD5,0xD6,0xD7,0xD8,0xD9,0xDA,0xE1,0xE2,0xE3,0xE4,0xE5,0xE6,
            0xE7,0xE8,0xE9,0xEA,0xF1,0xF2,0xF3,0xF4,0xF5,0xF6,0xF7,0xF8,0xF9,0xFA,0xFF,0xDA,
            0x00,0x08,0x01,0x01,0x00,0x00,0x3F,0x00,0xFB,0xD2,0x8A,0x28,0x03,0xFF,0xD9
        ])


@router.get("/{camera_id}/stream")
async def get_camera_stream(camera_id: str):
    """
    Continuous MJPEG stream at 25 FPS.
    Change detection uses (file_size, mtime) — O(1) vs O(n) byte comparison.
    """
    import time as _time

    async def frame_generator():
        STREAM_INTERVAL      = 0.050   # 20 FPS — matches agent write rate
        PLACEHOLDER_INTERVAL = 0.5
        placeholder_sent_at  = 0.0
        last_sig             = (0, 0.0)  # (size, mtime) — cheap change detector

        while True:
            frame_path = _resolve_live_frame(camera_id)

            if frame_path is not None:
                try:
                    st   = frame_path.stat()
                    sig  = (st.st_size, st.st_mtime)
                    if sig != last_sig and st.st_size > 100:
                        last_sig    = sig
                        image_bytes = frame_path.read_bytes()
                        if image_bytes:
                            yield (
                                b'--frame\r\n'
                                b'Content-Type: image/jpeg\r\n\r\n'
                                + image_bytes
                                + b'\r\n'
                            )
                except Exception as e:
                    logger.debug(f"[stream/{camera_id}] {e}")
                await asyncio.sleep(STREAM_INTERVAL)

            else:
                now = _time.monotonic()
                if now - placeholder_sent_at >= PLACEHOLDER_INTERVAL:
                    placeholder_sent_at = now
                    yield (
                        b'--frame\r\n'
                        b'Content-Type: image/jpeg\r\n\r\n'
                        + _make_placeholder_jpeg(camera_id)
                        + b'\r\n'
                    )
                await asyncio.sleep(PLACEHOLDER_INTERVAL)

    return StreamingResponse(
        frame_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control":               "no-cache, no-store, must-revalidate",
            "Pragma":                      "no-cache",
            "Expires":                     "0",
            "Connection":                  "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )
