from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)

    verification_request_id = Column(
        Integer,
        ForeignKey("verification_requests.id"),
        nullable=False
    )

    standard_weight = Column(Float, nullable=False)
    machine_reading = Column(Float, nullable=False)

    calculated_error = Column(Float, nullable=False)
    permissible_error = Column(Float, nullable=False)

    result = Column(String(20), nullable=False)

    inspector_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    remarks = Column(String(500), nullable=True)

    inspected_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )