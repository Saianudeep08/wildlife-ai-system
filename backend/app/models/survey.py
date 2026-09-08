from sqlalchemy import Column, Integer, String, Float, DateTime
from app.core.database import Base
import datetime

class Survey(Base):
    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, index=True)
    monitoring_location = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    habitat_type = Column(String)
    protected_area = Column(String)
    survey_date = Column(DateTime, default=datetime.datetime.utcnow)