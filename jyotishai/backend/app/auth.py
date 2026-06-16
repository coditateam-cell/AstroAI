from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import settings
import urllib.request
import json
import time

security = HTTPBearer()

# Cache for JWKS
_jwks_cache = {}
_jwks_last_fetched = 0
JWKS_CACHE_TTL = 3600  # Cache for 1 hour

def fetch_jwks(supabase_url: str) -> dict:
    global _jwks_cache, _jwks_last_fetched
    now = time.time()
    if _jwks_cache and (now - _jwks_last_fetched) < JWKS_CACHE_TTL:
        return _jwks_cache

    url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            _jwks_cache = data
            _jwks_last_fetched = now
            return data
    except Exception as e:
        if _jwks_cache:
            return _jwks_cache
        raise e

def get_key_for_kid(supabase_url: str, kid: str) -> dict:
    jwks = fetch_jwks(supabase_url)
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    
    # If not found, refresh cache once
    global _jwks_last_fetched
    _jwks_last_fetched = 0
    jwks = fetch_jwks(supabase_url)
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
            
    raise HTTPException(status_code=401, detail="JWK for kid not found")

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> dict:
    """
    Validates the Supabase JWT (supports HS256 and ES256) and returns the user payload.
    Use as a dependency in any route that requires authentication.
    """
    token = credentials.credentials
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")
        
        if alg == "HS256":
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated"
            )
            return payload
        elif alg == "ES256":
            kid = header.get("kid")
            if not kid:
                raise HTTPException(status_code=401, detail="Missing kid header parameter for ES256")
            key = get_key_for_kid(settings.supabase_url, kid)
            payload = jwt.decode(
                token,
                key,
                algorithms=["ES256"],
                audience="authenticated"
            )
            return payload
        else:
            raise HTTPException(status_code=401, detail=f"Unsupported token algorithm: {alg}")
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

