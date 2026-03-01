import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os, time, sys

load_dotenv('.env')
MONGO_URI = os.getenv('MONGO_URI')

async def main():
    lines = []
    client = AsyncIOMotorClient(MONGO_URI)
    db_name = MONGO_URI.split('/')[-1].split('?')[0] or 'nexvigil'
    db = client[db_name]
    cameras = await db['cameras'].find().to_list(20)
    lines.append(f'DB={db_name}  Total cameras: {len(cameras)}')
    for c in cameras:
        cid = str(c['_id'])
        name = c.get('camera_name', 'Unknown')
        url = c.get('camera_url', 'N/A')
        status = c.get('status', 'N/A')
        lines.append(f'CAM id={cid} name={name} url={url} status={status}')
        live_path = os.path.join('media', 'live', cid + '.jpg')
        if os.path.exists(live_path):
            stat = os.stat(live_path)
            age = int(time.time() - stat.st_mtime)
            lines.append(f'  FRAME: EXISTS size={stat.st_size}B age={age}s')
        else:
            lines.append(f'  FRAME: MISSING at {os.path.abspath(live_path)}')
    client.close()
    # Also check internal API key match
    from app.core.config import settings
    lines.append(f'INTERNAL_KEY={settings.INTERNAL_API_KEY[:10]}...')
    text = '\n'.join(lines)
    print(text)
    with open('diag_out.txt', 'w') as f:
        f.write(text)

asyncio.run(main())
