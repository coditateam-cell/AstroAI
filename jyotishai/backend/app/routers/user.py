from fastapi import APIRouter
from app.db.supabase import supabase

router = APIRouter()

@router.get("/ping")
def ping():
    return {"message": "user router alive"}

@router.get("/test-db")
def test_db():
    """Confirm Supabase connection is working."""
    result = supabase.table("users").select("id, email, plan").limit(5).execute()
    return {"rows": result.data, "count": len(result.data)}
