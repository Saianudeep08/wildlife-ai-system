import os
import shutil
import uuid

from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.observation import Observation
from app.ml.audio_detection import analyze_audio
from app.ml.animal_audio_detection import analyze_animal_audio


router = APIRouter(prefix="/audio", tags=["audio"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload/{survey_id}")
def upload_audio(
    survey_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # SAVE UPLOADED AUDIO
    # --------------------------------------------------------

    ext = file.filename.split(".")[-1].lower()
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # --------------------------------------------------------
    # BIRDNET WILDLIFE DETECTION
    # --------------------------------------------------------

    birdnet_detections = []

    try:
        birdnet_detections = analyze_audio(filepath)
    except Exception as error:
        print("BirdNET analysis failed:", error)

    # --------------------------------------------------------
    # CUSTOM ANIMAL CLASSIFIER
    # --------------------------------------------------------

    animal_detection = None

    try:
        animal_detection = analyze_animal_audio(filepath)
    except Exception as error:
        print("Animal classifier failed:", error)

    # --------------------------------------------------------
    # BIRDNET OBSERVATIONS
    # --------------------------------------------------------

    species_data = {}

    for detection in birdnet_detections:

        species = detection.get("common_name")

        if not species:
            continue

        confidence = float(
            detection.get("confidence") or 0
        )

        if (
            species not in species_data
            or confidence > species_data[species]
        ):
            species_data[species] = confidence

    observations_created = []

    for species, confidence in species_data.items():

        obs = Observation(
            survey_id=survey_id,
            image_path=filepath,
            source_type="audio",
            species_detected=species,
            confidence=confidence,
            count=1,
        )

        db.add(obs)
        db.flush()

        observations_created.append({
            "observation_id": obs.id,
            "species": species,
            "confidence": confidence,
            "detector": "BirdNET",
        })

    # --------------------------------------------------------
    # CUSTOM ANIMAL OBSERVATION
    # --------------------------------------------------------

    if animal_detection:

        animal = animal_detection.get("animal")
        confidence = float(
            animal_detection.get("confidence") or 0
        )

        # Only store the custom prediction when
        # confidence is reasonably strong.
        if animal and confidence >= 0.50:

            # Avoid duplicate observation if BirdNET
            # produced the same species name.
            already_exists = any(
                item["species"].lower()
                == animal.lower()
                for item in observations_created
            )

            if not already_exists:

                obs = Observation(
                    survey_id=survey_id,
                    image_path=filepath,
                    source_type="audio",
                    species_detected=animal,
                    confidence=confidence,
                    count=1,
                )

                db.add(obs)
                db.flush()

                observations_created.append({
                    "observation_id": obs.id,
                    "species": animal,
                    "confidence": confidence,
                    "detector": "Custom Animal Classifier",
                })

    # --------------------------------------------------------
    # SAVE DATABASE CHANGES
    # --------------------------------------------------------

    db.commit()

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {
        "observations": observations_created,

        "audio_path": filepath,

        "detections": birdnet_detections,

        "birdnet_detections": birdnet_detections,

        "animal_detection": animal_detection,
    }