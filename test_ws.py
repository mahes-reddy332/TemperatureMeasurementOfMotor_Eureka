import asyncio
import websockets
import json

async def test():
    try:
        ws = await websockets.connect('ws://localhost:8000/ws')
        for i in range(5):
            msg = await ws.recv()
            parsed = json.loads(msg)
            print(f"Msg {i}: T_true={parsed['T_true']}, T_final={parsed['T_final']}, omega={parsed['omega']}")
        await ws.close()
        print("SUCCESS: WebSocket streaming works")
    except Exception as e:
        print(f"ERROR: {e}")

asyncio.run(test())
