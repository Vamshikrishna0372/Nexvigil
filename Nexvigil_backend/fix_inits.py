import os

def fix_inits(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file == "__init__.py":
                fpath = os.path.join(root, file)
                try:
                    # Check if actually empty or has content. Keep content if valid?
                    # But most __init__.py here are empty or specific.
                    # I'll check size. If size < 10 bytes, rewrite empty.
                    size = os.path.getsize(fpath)
                    content = b""
                    with open(fpath, "rb") as f:
                        content = f.read()
                    
                    # If BOM or NULL
                    if b"\x00" in content or content.startswith(b'\xff\xfe') or content.startswith(b'\xfe\xff'):
                        print(f"Fixing corrupted {fpath}")
                        with open(fpath, "w", encoding="utf-8") as f:
                            pass # Writing empty
                    else:
                        print(f"Skipping OK {fpath}")

                except Exception as e:
                    print(f"Error fixing {fpath}: {e}")

fix_inits("app")
fix_inits("scripts")
