from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import chart, token, user, agent, sessions, chat

app = FastAPI(title="JyotishAI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chart.router, prefix="/chart", tags=["chart"])
app.include_router(token.router, prefix="/token", tags=["token"])
app.include_router(user.router, prefix="/user", tags=["user"])
app.include_router(agent.router, prefix="/agent", tags=["agent"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "JyotishAI API"}
