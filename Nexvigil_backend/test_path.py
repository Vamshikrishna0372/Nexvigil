import pathlib
import os

path = pathlib.Path(r"C:\Users\Vamshikrishna\Desktop\Nexvigil\Nexvigil_backend\app\api\v1\endpoints\cameras.py")
print(f"File: {path}")
print(f"Parents[4]: {path.parents[4]}")
print(f"Absolute Parents[4]: {path.resolve().parents[4]}")
