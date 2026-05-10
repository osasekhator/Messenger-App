from datetime import datetime, timezone
from bson import ObjectId
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from auth import hash_password, verify_password, create_access_token, verify_token
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import messages_collection, user_collection, conversations_collection
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
        self.active_connections = {}
        self.socket_rooms = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()

    def join_room(self, websocket: WebSocket, conversation_id: str):
        self.socket_rooms[websocket] = conversation_id

        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []

        self.active_connections[conversation_id].append(websocket)

    def disconnect(self, websocket: WebSocket):
        conversation_id = self.socket_rooms.get(websocket)

        if conversation_id and conversation_id in self.active_connections:
            if websocket in self.active_connections[conversation_id]:
                self.active_connections[conversation_id].remove(websocket)

        if websocket in self.socket_rooms:
            del self.socket_rooms[websocket]

    async def broadcast(self, conversation_id: str, message: dict):
        if conversation_id not in self.active_connections:
            return

        disconnected = []

        for connection in self.active_connections[conversation_id]:
            try:
                await connection.send_text(json.dumps(message))
            except:
                disconnected.append(connection)

        for conn in disconnected:
            self.disconnect(conn)


class User(BaseModel):
    username: str
    password: str

class ConvoRequest(BaseModel):
    user_id: str
    type: str


manager = ConnectionManager()


@app.post("/conversations")
async def create_conversation(conversation: dict):
    participants = await user_collection.find(
        {
            "username": {"$in": conversation["participants"]}
        }
    ).to_list(100)

    participants_ids = [ObjectId(p["_id"]) for p in participants]
    subject_id = ObjectId(conversation["sender"])
    participants_ids.append(subject_id)

    convo = {
        "name": conversation["name"],
        "participants": participants_ids,
        "type": conversation["type"]
    }
    result = await conversations_collection.insert_one(convo)
    convo["_id"] = str(result.inserted_id)
    return convo


@app.post("/getconversations")
async def get_conversations(request: ConvoRequest):
    conversations = await conversations_collection.find(
        {
            "participants": ObjectId(request.user_id),
            "type": request.type
        }
    ).to_list(100)

    result = []

    for convo in conversations:
        convo["_id"] = str(convo["_id"])
        convo["participants"] = [str(p) for p in convo["participants"]]

        if convo["type"] == "DMs":
            other_participants = [
                p for p in convo["participants"]
                if p != request.user_id
            ]

            users = await user_collection.find(
                {"_id": {"$in": [ObjectId(p) for p in other_participants]}}
            ).to_list(None)

            convo["display_name"] = users[0]["username"] if users else "Unknown"

        result.append(convo)

    return result


@app.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket, token: str):

    await manager.connect(websocket)

    conversation_id = None

    userID = verify_token(token)

    if not userID:
        await websocket.close()
        return

    user = await user_collection.find_one({
        "_id": ObjectId(userID)
    })

    username = user["username"]

    try:
        while True:
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)
            command = data["type"]

            if command == "join":
                conversation_id = data["conversation_id"]
                print("Joining conversation:", conversation_id)

                conversation = await conversations_collection.find_one({
                    "_id": ObjectId(conversation_id)
                })

                if not conversation:
                    await websocket.close()
                    print("Conversation not found")
                    return

                manager.join_room(websocket, conversation_id)

                old_messages = await messages_collection.find(
                    {
                        "conversation_id": ObjectId(conversation_id)
                    }
                ).to_list(100)

                print("Found messages:", len(old_messages))

                for msg in old_messages:
                    msg["_id"] = str(msg["_id"])
                    msg["user_id"] = str(msg["user_id"])
                    msg["conversation_id"] = str(msg["conversation_id"])
                    msg["timestamp"] = msg["timestamp"].isoformat() if isinstance(msg["timestamp"], datetime) else msg["timestamp"]

                    await websocket.send_json(msg)

            elif command == "message":
                conversation_id = manager.socket_rooms.get(websocket)

                if not conversation_id:
                    print("No conversation joined")
                    return

                message = {
                    "conversation_id": ObjectId(conversation_id),
                    "user_id": ObjectId(userID),
                    "sender": username,
                    "content": data["content"],
                    "timestamp": datetime.now(timezone.utc)
                }

                result = await messages_collection.insert_one(message)

                message["_id"] = str(result.inserted_id)
                message["user_id"] = str(message["user_id"])
                message["conversation_id"] = str(message["conversation_id"])
                message["timestamp"] = message["timestamp"].isoformat()
                await manager.broadcast(conversation_id, message)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("Client disconnected")

    except Exception as e:
        print("Websocket error:", e)
        manager.disconnect(websocket)


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


@app.post("/login")
async def login(user: User):
    existing_user = await user_collection.find_one(
        {
            "username": user.username
        }
    )

    if not existing_user:
        raise HTTPException(status_code=400, detail="Invalid username or password")

    if not verify_password(user.password, existing_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Invalid username or password")

    token = create_access_token({"sub": str(existing_user["_id"])})

    return {"access_token": token, "token_type": "bearer", "sender_id": str(existing_user["_id"])}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)