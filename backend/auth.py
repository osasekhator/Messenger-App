from datetime import datetime, timedelta, timezone
from json import load
from passlib.context import CryptContext
from dotenv import load_dotenv
from jose import jwt
import os

load_dotenv()

# switched from bycrypt to argon2 for better security and byte limitations
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY") # set this in my .env file, remember not to cmit it to GitHub
ALGORITHM = "HS256" # the algorithm used to sign JWT tokens

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

# create JWT token with 1 day expiration for authentication and storing user info in the frontend
def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(days=1)

    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
