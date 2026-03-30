from groq import Groq
from app.core.config import settings
import os
import logging

logger = logging.getLogger(__name__)

def get_groq_client():
    # STEP 3: VERIFY API KEY LOAD
    api_key = settings.GROQ_API_KEY
    print(f"DEBUG: GROQ_API_KEY from Settings: '{api_key[:10] if api_key else 'None'}'")
    
    if not api_key:
        return None
    return Groq(api_key=api_key)

def ask_ai(query: str):
    """
    Standard synchronous ask_ai implementation with RAW diagnostics.
    """
    # STEP 4: VERIFY INTERNET ACCESS
    import requests
    try:
        status = requests.get("https://api.groq.com", timeout=5).status_code
        print(f"DEBUG: Groq Connectivity Test: {status}")
    except Exception as e:
        print(f"DEBUG: Groq Connectivity FAILED: {str(e)}")

    try:
        client = get_groq_client()
        if not client:
            raise Exception("STEP 3 FAILED: API Key missing in Configuration.")
            
        # STEP 1 & 2: UPDATE MODEL NAME (With Fallback Logic)
        models_to_try = ["llama3-70b-8192", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"]
        
        last_error = None
        for model_id in models_to_try:
            try:
                print(f"DEBUG: ATTEMPTING GROQ API (Model: {model_id})...")
                response = client.chat.completions.create(
                    messages=[
                        {"role": "user", "content": query}
                    ],
                    model=model_id
                )
                print(f"DEBUG: GROQ SUCCESS ({model_id})")
                # STEP 9: RETURN RAW RESPONSE
                return response.choices[0].message.content
            except Exception as e:
                last_error = str(e)
                print(f"DEBUG: {model_id} FAILED: {last_error[:50]}")
                continue # Try next model
        
        raise Exception(f"All Groq models failed. Last error: {last_error}")

    except Exception as e:
        # STEP 1 & 2: PRINT FULL ERROR & RAISE
        print(f"FULL ERROR: {str(e)}") 
        # Re-introducing a friendly message now that we know the root cause (Model issue)
        return f"AI Service Status: {str(e)[:100]}"

async def ask_ai_async(query: str):
    """
    Async wrapper for FastAPI non-blocking execution.
    """
    import asyncio
    return await asyncio.to_thread(ask_ai, query)
