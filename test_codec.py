import cv2
print(cv2.getBuildInformation())

out = cv2.VideoWriter('test.mp4', cv2.VideoWriter_fourcc(*'avc1'), 10.0, (640, 480))
print("avc1 mp4:", out.isOpened())
out.release()

out2 = cv2.VideoWriter('test.webm', cv2.VideoWriter_fourcc(*'VP80'), 10.0, (640, 480))
print("vp80 webm:", out2.isOpened())
out2.release()
