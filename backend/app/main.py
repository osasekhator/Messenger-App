from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.sockets import chat_ws
from .auth import router as auth_router 

app = FastAPI()
app.include_router(chat_ws.router)
app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Backend running"}