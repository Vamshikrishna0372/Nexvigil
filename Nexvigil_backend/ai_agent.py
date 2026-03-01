import sys
import os

# Ensure the current directory is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ai_agent.main import run_ai

if __name__ == "__main__":
    run_ai()
