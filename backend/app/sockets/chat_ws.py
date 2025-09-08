from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()
connections = {}

@router.websocket("/chat/{chat_id}")
async def chat_websocket(websocket: WebSocket, chat_id: str):
    await websocket.accept()
    if chat_id not in connections:
        connections[chat_id] = []
    connections[chat_id].append(websocket)

    try:
        while True:
            message = await websocket.receive_text()
            for conn in connections[chat_id]:
                await conn.send_text(message)
    except WebSocketDisconnect:
        connections[chat_id].remove(websocket)