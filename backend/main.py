from datetime import datetime, timezone
from bson import ObjectId
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from auth import hash_password, verify_password, create_access_token, verify_token
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import messages_collection, user_collection, conversations_collection
import json
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def handle_expired_token(websocket: WebSocket, token: str):
    while True:
        await asyncio.sleep(30)  # Check every 30 seconds

        if not verify_token(token):
            print("Token expired for user, closing websocket")
            await websocket.close(code=1008, reason="Token expired")
            return

class ConnectionManager:
    def __init__(self):
        self.active_connections = {}
        self.socket_rooms = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()

    def join_room(self, websocket: WebSocket, conversation_id: str):
        # remove this websocket from any previous room first, was broadcasting twice
        old_room = self.socket_rooms.get(websocket)
        if old_room and old_room in self.active_connections:
            if websocket in self.active_connections[old_room]:
                self.active_connections[old_room].remove(websocket)

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
    convo["participants"] = [str(p) for p in convo["participants"]]
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
        convo_id = convo["_id"]
        convo["_id"] = str(convo_id)
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

        last_read = convo.get("last_read", {}).get(request.user_id)

        if last_read:
            unread_count = await messages_collection.count_documents(
                {
                    "conversation_id": convo_id,
                    "timestamp": {"$gt": last_read},
                    "user_id": {"$ne": ObjectId(request.user_id)}
                }
            )
        else:
            unread_count = await messages_collection.count_documents(
                {
                    "conversation_id": convo_id,
                    "user_id": {"$ne": ObjectId(request.user_id)}
                }
            )

        convo["unread"] = unread_count > 0
        print(f"Conversation {convo['_id']}: unread_count={unread_count}, unread={convo['unread']}")
        result.append(convo)

    return result


@app.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket, token: str):

    await manager.connect(websocket)

    conversation_id = None

    userID = verify_token(token)

    if not userID:
        await websocket.close(code=1008, reason="Invalid or expired token")
        return

    user = await user_collection.find_one({
        "_id": ObjectId(userID)
    })

    username = user["username"]

    # start a background task to check for token expiration every 30 seconds
    print("Starting token expiry task for user:", username)
    expiry_task = asyncio.create_task(handle_expired_token(websocket, token))

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

                # adds last_read time for each user in the conversation - to be used for unread mesages
                update_result = await conversations_collection.update_one(
                    {"_id": ObjectId(conversation_id)},
                    {"$set": {f"last_read.{userID}": datetime.now(timezone.utc)}}
                )
                print(f"last_read update - matched: {update_result.matched_count}, modified: {update_result.modified_count}")

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

                    ts = msg["timestamp"]

                    # ensure timestamp is timezone-aware and convert to ISO format for frontend
                    if isinstance(ts, datetime):
                        if ts.tzinfo is None:
                            ts = ts.replace(tzinfo=timezone.utc)
                        msg["timestamp"] = ts.isoformat()
                    #msg["timestamp"] = msg["timestamp"].isoformat() if isinstance(msg["timestamp"], datetime) else msg["timestamp"]

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
        expiry_task.cancel()  # Stop the token expiration task when the client disconnects
        print("Client disconnected")

    except Exception as e:
        print("Websocket error:", e)
        expiry_task.cancel()  # Stop the token expiration task on error
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
        raise HTTPException(status_code=400, detail="This user does not exist, please sign up first")

    if not verify_password(user.password, existing_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Invalid username or password")

    token = create_access_token({"sub": str(existing_user["_id"])})

    return {"access_token": token, "token_type": "bearer", "sender_id": str(existing_user["_id"])}

# to run the server, use: uvicorn main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)