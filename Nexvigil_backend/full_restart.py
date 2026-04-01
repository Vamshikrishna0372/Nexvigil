import subprocess
import time
import os

print("🚀 STARTING NEXVIGIL CORE SERVICES...")

# 1. Auth Server
print("  - Starting Auth Server (8081)...")
auth = subprocess.Popen("node auth_server.js", shell=True)
time.sleep(3)

# 2. Main FastAPI Backend
print("  - Starting FastAPI Backend (8000)...")
backend = subprocess.Popen("python main.py", shell=True)
time.sleep(5)

# 3. AI Agent
print("  - Starting AI Agent...")
agent = subprocess.Popen("python ai_agent.py", shell=True)

print("\n✅ ALL SERVICES STARTED.")
print("   - Terminal 1: Auth (8081)")
print("   - Terminal 2: Backend (8000)")
print("   - Terminal 3: AI Agent")
print("\nCheck windows for the running outputs.")
