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

    async def connect(self, websocket: WebSocket, conversation_id: str):
        await websocket.accept()

        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []

        self.active_connections[conversation_id].append(websocket)

    def disconnect(self, websocket: WebSocket, conversation_id: str):
        if conversation_id in self.active_connections:
            if websocket in self.active_connections[conversation_id]:
                self.active_connections[conversation_id].remove(websocket)

    # broadcast message to all the connected clients
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
            self.disconnect(conn, conversation_id)

class User(BaseModel):
    username: str
    password: str
    
class ConvoRequest(BaseModel):
    user_id: str
    type: str

manager = ConnectionManager()

# ----conversation endpoints-----

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

        # DM: pull the other participant's username to display as the convo name in the frontend
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

# -----websocket endpoint for real-time chat (WIP: still working through connections closing spontneously---)
@app.websocket("/chat/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, token: str, conversation_id: str):

    await manager.connect(websocket, conversation_id)

    # verify the access token
    userID = verify_token(token)

    if not userID:
        await websocket.close()
        return
    
    conversation = await conversations_collection.find_one({
        "_id": ObjectId(conversation_id)
    })

    if not conversation:
        await websocket.close()
        return
    
    user = await user_collection.find_one({
        "_id": ObjectId(userID)
    })

    username = user["username"]

    # send old messages for chat history
    old_messages = await messages_collection.find(
        {
            "conversation_id": ObjectId(conversation_id)
        }
    ).to_list(100)

    for msg in old_messages:

        msg["_id"] = str(msg["_id"])
        msg["user_id"] = str(msg["user_id"])
        msg["conversation_id"] = str(msg["conversation_id"])
        msg["timestamp"] = msg["timestamp"].isoformat()

        await websocket.send_json(msg)

    try:
        while True:

            data = await websocket.receive_text()

            # create message object with username and content
            message = {
                "conversation_id": ObjectId(conversation_id),
                "user_id": ObjectId(userID),
                "sender": username,
                "content": data,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

            # save to MongoDB
            result = await messages_collection.insert_one(message)

            # add serializable id (kept getting "cannot serialize ObjectId" error without this)
            message["_id"] = str(result.inserted_id)
            message["user_id"] = str(message["user_id"])
            message["conversation_id"] = str(message["conversation_id"])

            # broadcast the  message
            await manager.broadcast(conversation_id, message)

    except WebSocketDisconnect:
        manager.disconnect(websocket, conversation_id)
        print("Client disconnected")

    except Exception as e:
        print("Websocket error:", e)
        manager.disconnect(websocket, conversation_id)

# -----my authentication endpoints (signup and login)-----

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

# login endpoint
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
    
    token = create_access_token({"sub": str(existing_user["_id"])})

    # sending the token and user id to the frontend so I can store it in localStorage and use it for authentication and identifying the user in the frontend
    return {"access_token": token, "token_type": "bearer", "sender_id": str(existing_user["_id"])}