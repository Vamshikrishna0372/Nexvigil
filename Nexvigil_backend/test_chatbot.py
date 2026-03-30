import asyncio
import os
import sys
from dotenv import load_dotenv

# Add parent dir to path
sys.path.append(os.getcwd())

load_dotenv()

async def test_chatbot():
    print("--- INDEPENDENT CHATBOT TEST (STRICT 15s COOLDOWN) ---")
    
    # Import service
    from app.services.ai_assistant_service import ai_assistant_service
    
    # USER REQUESTED QUERIES
    test_queries = ["Hello", "What is AI?"]
    
    for query in test_queries:
        print(f"\n[QUERY]: {query}")
        print("Assistant: Thinking...")
        
        # Test with no alerts first
        result = await ai_assistant_service.ask_ai(query, alerts=[])
        
        answer = result.get("answer", "NO RESPONSE")
        intent = result.get("intent", "UNKNOWN")
        
        print(f"Response: {answer}")
        print(f"Intent detected: {intent}")
        
        if "System is processing" in answer:
             print("⏳ LOCAL THROTTLE: Script running too fast. Increase sleep.")
        elif "AI is busy" in answer:
             print(f"❌ GEMINI ERROR: {answer}")
        elif "LINK CONGESTED" in answer.upper():
            print("❌ FAIL: Still showing fallback/blocking message!")
        else:
            print("✅ SUCCESS: Real AI response received.")
            
        # Wait 15 seconds to clear even the strictest free tier throttle
        print("Waiting 15s for rate limit recovery...")
        await asyncio.sleep(15)

if __name__ == "__main__":
    asyncio.run(test_chatbot())
