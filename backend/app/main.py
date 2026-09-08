import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.models import user, survey, observation
from app.api import auth, surveys, images, audio, analytics, reports


app = FastAPI(title="Wildlife Population Intelligence System")


Base.metadata.create_all(bind=engine)


frontend_url = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(surveys.router)
app.include_router(images.router)
app.include_router(audio.router)
app.include_router(analytics.router)
app.include_router(reports.router)


@app.get("/health")
def health():
    return {"status": "ok"}
