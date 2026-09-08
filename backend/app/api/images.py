import os, shutil, uuid
from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.observation import Observation
from app.ml.species_detection import detect_species

router = APIRouter(prefix="/images", tags=["images"])
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload/{survey_id}")
def upload_image(survey_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    detections = detect_species(filepath)

    obs = Observation(survey_id=survey_id, image_path=filepath)
    if detections:
        obs.species_detected = detections[0]["label"]
        obs.confidence = detections[0]["confidence"]
    db.add(obs)
    db.commit()
    db.refresh(obs)

    return {"observation_id": obs.id, "image_path": filepath, "detections": detections}
from app.models.observation import Observation

@router.get("/observations")
def list_observations(db: Session = Depends(get_db)):
    return db.query(Observation).all()