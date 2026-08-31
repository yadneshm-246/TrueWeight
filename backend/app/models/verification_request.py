from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class VerificationRequest(Base):
    __tablename__ = "verification_requests"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    application_id = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    instrument_id = Column(
        Integer,
        ForeignKey("instruments.id"),
        nullable=False
    )

    status = Column(
        String(30),
        nullable=False,
        default="PENDING"
    )

    requested_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )