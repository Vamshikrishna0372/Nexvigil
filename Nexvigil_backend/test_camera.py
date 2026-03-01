import cv2
import os

def test_cam(index):
    print(f"Testing camera index {index}...")
    # On Windows, try different backends
    backends = [cv2.CAP_DSHOW, cv2.CAP_MSMF, None]
    for b in backends:
        try:
            if b is not None:
                cap = cv2.VideoCapture(index, b)
            else:
                cap = cv2.VideoCapture(index)
            
            if cap and cap.isOpened():
                ret, frame = cap.read()
                print(f"  Backend {b}: SUCCESS (Opened and read: {ret})")
                cap.release()
                return True
            else:
                print(f"  Backend {b}: FAILED to open")
            if cap: cap.release()
        except Exception as e:
            print(f"  Backend {b}: ERROR: {e}")
    return False

if __name__ == "__main__":
    found = False
    for i in range(5):
        if test_cam(i):
            found = True
            print(f"Camera found at index {i}")
            # break # keep checking others
    if not found:
        print("No cameras found at indices 0-4")
