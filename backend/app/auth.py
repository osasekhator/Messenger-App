from fastapi import APIRouter, HTTPException
from passlib.context import CryptContext

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
users_db = {}

@router.post("/signup")
def signup(username: str, password: str):
    if username in users_db:
        raise HTTPException(status_code=400, detail="User already exists")
    
    hashed_pwd = pwd_context.hash(password)
    users_db[username] = {"username": username, "hashed_password": hashed_pwd}
    return {"message": "User created"}