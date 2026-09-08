from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.models.survey import Survey
from app.models.observation import Observation

router = APIRouter(prefix="/surveys", tags=["surveys"])


class SurveyCreate(BaseModel):
    monitoring_location: str
    latitude: float
    longitude: float
    habitat_type: str
    protected_area: str


@router.post("/")
def create_survey(data: SurveyCreate, db: Session = Depends(get_db)):
    survey = Survey(**data.dict())
    db.add(survey)
    db.commit()
    db.refresh(survey)
    return survey


@router.get("/")
def list_surveys(db: Session = Depends(get_db)):
    return db.query(Survey).all()


@router.delete("/{survey_id}")
def delete_survey(survey_id: int, db: Session = Depends(get_db)):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()

    if not survey:
        raise HTTPException(
            status_code=404,
            detail="Survey not found",
        )

    db.query(Observation).filter(
        Observation.survey_id == survey_id
    ).delete(synchronize_session=False)

    db.delete(survey)
    db.commit()

    return {
        "message": "Survey deleted successfully",
        "survey_id": survey_id,
    }