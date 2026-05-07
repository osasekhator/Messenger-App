from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from auth import hash_password, verify_password, create_access_token, verify_token
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import messages_collection, user_collection
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
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

class User(BaseModel):
    username: str
    password: str
    
manager = ConnectionManager()


@app.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket, token: str):

    await manager.connect(websocket)

    # verify the access token
    username = verify_token(token)

    if not username:
        await websocket.close()
        return

    # send old messages for chat history
    old_messages = await messages_collection.find().to_list(100)

    for msg in old_messages:

        msg["_id"] = str(msg["_id"])

        await websocket.send_text(json.dumps(msg))

    try:
        while True:

            data = await websocket.receive_text()

            # create message object with username and content
            message = {
                "username": username,
                "content": data
            }

            # save to MongoDB
            result = await messages_collection.insert_one(message)

            # add serializable id (kept getting "cannot serialize ObjectId" error without this)
            message["_id"] = str(result.inserted_id)

            # broadcast the  message
            await manager.broadcast(message)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("Client disconnected")

# user signup endpoint)
@app.post("/signup")
async def signup(user: User):

    existing_user = await user_collection.find_one({
        "username": user.username
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    hashed_pwd = hash_password(user.password)
    user_data = {"username": user.username, "hashed_password": hashed_pwd}

    await user_collection.insert_one(user_data)

    return {"message": "User created"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

# login endpoint (WIP)
@app.post("/login")
async def login(user:User):
    
    existing_user = await user_collection.find_one(
        {
            "username": user.username
        }
    )

    if not existing_user:
        raise HTTPException(status_code=400, detail="Invalid username or password")
    
    if not verify_password(user.password, existing_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Invalid username or password")
    
    token = create_access_token({"sub": user.username})

    return {"access_token": token, "token_type": "bearer"}