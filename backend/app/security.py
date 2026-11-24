import uuid
import bcrypt
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from jose import jwt, JWTError
from app.config import settings

def hash_password(password: str) -> str:
    # Truncate password to 72 bytes if necessary for bcrypt safety
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False

def validate_password_complexity(
    nova_senha: str,
    senha_atual: Optional[str] = None,
    user_hashed_password: Optional[str] = None
) -> None:
    """
    Valida política de segurança de senhas da Sprint SEC-01:
    - Mínimo de 8 caracteres
    - Pelo menos uma letra maiúscula (A-Z)
    - Pelo menos uma letra minúscula (a-z)
    - Pelo menos um dígito numérico (0-9)
    - Máximo de 72 bytes em UTF-8 (sem truncamento silencioso)
    - Diferente da senha atual
    """
    if not nova_senha or nova_senha.isspace():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha não pode ser vazia."
        )

    # Limite rigoroso de 72 bytes UTF-8 (evita truncamento silencioso do Bcrypt em ASCII ou multibyte)
    encoded_bytes = nova_senha.encode("utf-8")
    if len(encoded_bytes) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha excede o limite máximo permitido de 72 bytes de segurança."
        )

    if len(nova_senha) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve possuir no mínimo 8 caracteres."
        )

    if not re.search(r"[A-Z]", nova_senha):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve conter pelo menos uma letra maiúscula."
        )

    if not re.search(r"[a-z]", nova_senha):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve conter pelo menos uma letra minúscula."
        )

    if not re.search(r"[0-9]", nova_senha):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve conter pelo menos um número."
        )

    if senha_atual is not None and nova_senha == senha_atual:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha não pode ser igual à senha provisória/atual."
        )

    if user_hashed_password and verify_password(nova_senha, user_hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha não pode ser igual à senha provisória/atual."
        )

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Cria access token JWT com claims criptográficas RFC 7519:
    - iss (Issuer): gestor-mei-api
    - iat (Issued At): emissão em UTC
    - nbf (Not Before): vigência imediata
    - jti (JWT ID): identificador UUIDv4 único para rastreabilidade/revogação
    - exp (Expiration): tempo de expiração seguro (2h prod / 12h dev)
    """
    to_encode = data.copy()
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Claims RFC 7519
    to_encode.setdefault("iss", settings.JWT_ISSUER)
    to_encode.setdefault("iat", now)
    to_encode.setdefault("nbf", now)
    to_encode.setdefault("jti", uuid.uuid4().hex)
    to_encode["exp"] = expire

    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodifica e valida assinatura e expiração do JWT.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_aud": False}
        )
        return payload
    except JWTError:
        return None
