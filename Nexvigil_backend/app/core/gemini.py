from google import genai
import time
import logging
import os
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class GeminiClient:
    _instance = None
    _client = None
    _last_call_time = 0.0
    _cooldown = 10.0 # 10 seconds cooldown between calls

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GeminiClient, cls).__new__(cls)
        return cls._instance

    def get_client(self):
        if self._client:
            return self._client
        
        api_key = os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
        if not api_key:
            logger.error("GEMINI_API_KEY not found in environment or settings")
            return None
            
        try:
            self._client = genai.Client(api_key=api_key)
            return self._client
        except Exception as e:
            logger.error(f"Failed to initialize Gemini Client: {e}")
            return None

    def can_call(self) -> bool:
        now = time.time()
        if now - self._last_call_time < self._cooldown:
            return False
        self._last_call_time = now
        return True

    async def generate_content(self, prompt: str, model: str = "gemini-2.0-flash") -> str:
        """
        --- STABLE GENERATION ---
        If generation fails (404/Quota), returns empty string to allow local fallback.
        """
        if not self.can_call():
            logger.warning("Gemini Cooldown Active. Skipping API call.")
            return ""

        client = self.get_client()
        if not client: return ""

        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt
            )
            if response and response.text:
                return response.text.strip()
            return ""
        except Exception as e:
            # Only log the status code/brief message to avoid terminal flooding
            logger.warning(f"AI API Response: {str(e)[:50]}...")
            return ""

    def list_models(self):
        """Debug method to verify API key and model access."""
        client = self.get_client()
        if not client: return ["Client offline"]
        try:
            models = client.models.list()
            return [m.name for m in models]
        except Exception as e:
            return [f"List Error: {str(e)}"]

gemini_client = GeminiClient()
