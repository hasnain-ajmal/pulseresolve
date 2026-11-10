from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.errors import ApiError
from app.models import User
from app.schemas import LoginIn, LoginOut, UserOut
from app.security import create_token, get_current_user, rate_limit, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginOut)
def login(body: LoginIn, db: Session = Depends(get_db),
          _: None = Depends(rate_limit("login", [(10, 60)]))):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise ApiError(401, "unauthorized", "Invalid username or password.")
    return LoginOut(access_token=create_token(user), user=UserOut(username=user.username, role=user.role))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut(username=user.username, role=user.role)
