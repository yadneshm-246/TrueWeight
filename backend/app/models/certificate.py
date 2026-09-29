from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.sql import func

from app.database import Base


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)

    verification_request_id = Column(
        Integer,
        ForeignKey("verification_requests.id"),
        nullable=False,
        unique=True,
        index=True,
    )

    certificate_number = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    issued_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    valid_until = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    pdf_path = Column(
        String(500),
        nullable=True,
    )

    qr_path = Column(
        String(500),
        nullable=True,
    )

    # SHA-256 hash of canonical certificate data
    certificate_hash = Column(
        String(64),
        nullable=True,
        index=True,
    )

    # Blockchain information
    blockchain_network = Column(
        String(100),
        nullable=True,
    )

    blockchain_status = Column(
        String(30),
        nullable=True,
    )

    blockchain_tx_hash = Column(
        String(100),
        nullable=True,
    )

    blockchain_contract = Column(
        String(100),
        nullable=True,
    )

    anchored_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    blockchain_error = Column(
        Text,
        nullable=True,
    )