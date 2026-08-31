from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)

    certificate_number = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    verification_request_id = Column(
        Integer,
        ForeignKey("verification_requests.id"),
        nullable=False
    )

    certificate_file = Column(String(500), nullable=True)
    qr_code = Column(String(500), nullable=True)

    issued_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    valid_until = Column(Date, nullable=True)
    