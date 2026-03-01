import os

files_to_fix = [
    "app/__init__.py",
    "app/middlewares/__init__.py",
    "scripts/__init__.py"
]

for fpath in files_to_fix:
    try:
        if os.path.exists(fpath):
            os.remove(fpath)
        with open(fpath, "w", encoding="utf-8") as f:
            pass
        print(f"Fixed {fpath}")
    except Exception as e:
        print(f"Error fixing {fpath}: {e}")
