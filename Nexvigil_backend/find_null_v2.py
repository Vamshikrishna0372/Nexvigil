import os
import sys

def check_null_bytes(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".py") or file.endswith(".env"):
                path = os.path.join(root, file)
                try:
                    with open(path, "rb") as f:
                        content = f.read()
                        if b"\x00" in content:
                            print(f"NULL BYTE FOUND IN: {path}")
                            sys.stdout.flush()
                        if content.startswith(b'\xff\xfe') or content.startswith(b'\xfe\xff'):
                             print(f"BOM FOUND IN: {path}")
                             sys.stdout.flush()
                except Exception as e:
                    print(f"Error reading {path}: {e}")

check_null_bytes("app")
check_null_bytes(".")
check_null_bytes("scripts")
