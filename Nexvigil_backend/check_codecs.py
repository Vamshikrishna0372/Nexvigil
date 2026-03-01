import cv2
import os

codecs = ['avc1', 'mp4v', 'XVID', 'H264']
for c in codecs:
    fourcc = cv2.VideoWriter_fourcc(*c)
    out = cv2.VideoWriter("test_codec.mp4", fourcc, 20.0, (640, 480))
    if out.isOpened():
        print(f"Codec {c} is SUPPORTED")
        out.release()
    else:
        print(f"Codec {c} is NOT supported")
    if os.path.exists("test_codec.mp4"):
        os.remove("test_codec.mp4")
