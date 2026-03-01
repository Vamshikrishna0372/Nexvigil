
import cv2
import os

def test_camera():
    source = 0
    name = "Laptop"
    
    backends = [cv2.CAP_DSHOW, cv2.CAP_MSMF, None]
    for b in backends:
        print(f"Trying backend {b}...")
        try:
            if b is not None:
                cap = cv2.VideoCapture(source, b)
            else:
                cap = cv2.VideoCapture(source)
            
            if cap and cap.isOpened():
                ret, frame = cap.read()
                if ret:
                    print(f"SUCCESS: Opened {name} with backend {b} and captured a frame.")
                    h, w = frame.shape[:2]
                    print(f"Frame size: {w}x{h}")
                    cap.release()
                    return
                else:
                    print(f"Opened {name} with backend {b} but failed to read frame.")
            else:
                print(f"Failed to open {name} with backend {b}")
            if cap:
                cap.release()
        except Exception as e:
            print(f"Error with backend {b}: {e}")

if __name__ == "__main__":
    test_camera()
