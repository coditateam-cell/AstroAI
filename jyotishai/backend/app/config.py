from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    livekit_api_key: str
    livekit_api_secret: str
    livekit_url: str
    anthropic_api_key: str
    elevenlabs_api_key: str
    deepgram_api_key: str
    openrouter_api_key: str
    gemini_api_key: str
    supabase_jwt_secret: str
    backend_agent_secret: str

    class Config:
        env_file = ".env"

settings = Settings()
