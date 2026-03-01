# Nexvigil Camera Setup Guide

To ensure high stability and correct video display, follow these rules for different camera types:

## 1. Laptop Webcam
- **Source Index**: Usually `0`, `1`, or `2`.
- **Requirements**:
  - Ensure no other application (Zoom, Chrome, Teams, etc.) is using the webcam.
  - The AI agent will automatically try to open it using DirectShow or MSMF on Windows.

## 2. Phone IP Camera (Mobile as CCTV)
- **App Recommendation**: Use "IP Webcam" (Android) or similar.
- **Correct URL Format**: 
  - `http://PHONE_IP:8080/video`
  - **NOT** just `http://PHONE_IP:8080` (this is the admin panel).
- **Network Requirements**:
  - Phone and Laptop MUST be on the **SAME WiFi network**.
  - **Mobile Data must be OFF** to avoid network routing issues.
- **Manual Test**: Try opening the URL in your laptop browser first. If you don't see video there, Nexvigil won't see it either.

## 3. RTSP CCTV Cameras
- **URL Format**: `rtsp://username:password@IP_ADDRESS:PORT/stream_path`
- **Low Latency**: Nexvigil uses FFMPEG backend for RTSP to minimize lag.

## 4. Connection Stability Rules
- **Health Monitoring**: If a camera fails 5 consecutive times, it is marked as `offline`.
- **Automatic Recovery**: The AI engine retries connections every 10 seconds.
- **Firewall**: Ensure Python is allowed in Windows Firewall for Private networks to receive streams.

## 5. Development Debugging
- To see the live feed directly on your desktop for debugging:
  - Set `SHOW_DISPLAY=True` in your `.env` file.
  - Press `ESC` on the video window to close a specific stream.
