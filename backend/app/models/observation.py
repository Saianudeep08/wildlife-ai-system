from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from app.core.database import Base
import datetime

class Observation(Base):
    __tablename__ = "observations"

    id = Column(Integer, primary_key=True, index=True)
    survey_id = Column(Integer, ForeignKey("surveys.id"))
    image_path = Column(String)
    source_type = Column(String, default="image")
    species_detected = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)