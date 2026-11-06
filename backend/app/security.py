import uuid
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
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
