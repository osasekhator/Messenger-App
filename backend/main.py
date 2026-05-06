from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from auth import hash_password, verify_password, create_access_token
from fastapi.middleware.cors import CORSMiddleware
from database import messages_collection, user_collection
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    # broadcast message to all the connected clients
    async def broadcast(self, message):
        disconnected = []

        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                disconnected.append(connection)

        # remove dead connections
        for connection in disconnected:
            self.disconnect(connection)

manager = ConnectionManager()


@app.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket):

    await manager.connect(websocket)

    # send old messages for chat history
    old_messages = await messages_collection.find().to_list(100)

    for msg in old_messages:

        msg["_id"] = str(msg["_id"])

        await websocket.send_text(json.dumps(msg))

    try:
        while True:

            data = await websocket.receive_text()

            message = json.loads(data)

            # save to MongoDB
            result = await messages_collection.insert_one(message)

            # add serializable id (kept getting "cannot serialize ObjectId" error without this)
            message["_id"] = str(result.inserted_id)

            # broadcast the  message
            await manager.broadcast(message)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("Client disconnected")

# user signup endpoint (WIP)
@app.post("/signup")
async def signup(username: str, password: str):

    existing_user = await user_collection.find_one({
        "username": username
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    hashed_pwd = hash_password(password)
    user_data = {"username": username, "hashed_password": hashed_pwd}
    await user_collection.insert_one(user_data)
    return {"message": "User created"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)