from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.models.verification_request import VerificationRequest
from app.models.instrument import Instrument
from app.auth.security import get_current_user


router = APIRouter(
    prefix="/verification",
    tags=["Verification"]
)


# =========================================================
# CREATE VERIFICATION REQUEST
# SHOPKEEPER ONLY
# =========================================================

@router.post("/request")
def create_verification_request(
    instrument_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "SHOPKEEPER":
        raise HTTPException(
            status_code=403,
            detail="Only shopkeepers can request verification"
        )

    instrument = (
        db.query(Instrument)
        .filter(Instrument.id == instrument_id)
        .first()
    )

    if not instrument:
        raise HTTPException(
            status_code=404,
            detail="Instrument not found"
        )

    if instrument.owner_id != current_user["user_id"]:
        raise HTTPException(
            status_code=403,
            detail="You do not own this instrument"
        )

    existing_request = (
        db.query(VerificationRequest)
        .filter(
            VerificationRequest.instrument_id == instrument_id,
            VerificationRequest.status == "PENDING"
        )
        .first()
    )

    if existing_request:
        raise HTTPException(
            status_code=400,
            detail="A verification request is already pending for this instrument"
        )

    application_id = "TW-" + uuid.uuid4().hex[:8].upper()

    verification_request = VerificationRequest(
        application_id=application_id,
        instrument_id=instrument_id,
        status="PENDING"
    )

    db.add(verification_request)
    db.commit()
    db.refresh(verification_request)

    return {
        "message": "Verification request created successfully",
        "request_id": verification_request.id,
        "application_id": verification_request.application_id,
        "instrument_id": verification_request.instrument_id,
        "status": verification_request.status
    }


# =========================================================
# GET ALL VERIFICATION REQUESTS
# INSPECTOR ONLY
# =========================================================

@router.get("/")
def get_verification_requests(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "INSPECTOR":
        raise HTTPException(
            status_code=403,
            detail="Only inspectors can view verification requests"
        )

    requests = (
        db.query(VerificationRequest)
        .order_by(
            VerificationRequest.requested_at.desc()
        )
        .all()
    )

    result = []

    for request in requests:

        instrument = (
            db.query(Instrument)
            .filter(
                Instrument.id == request.instrument_id
            )
            .first()
        )

        result.append({
            "request_id": request.id,
            "application_id": request.application_id,
            "instrument_id": request.instrument_id,
            "status": request.status,
            "requested_at": request.requested_at,

            "instrument": {
                "unique_id": instrument.unique_id if instrument else None,
                "instrument_type": (
                    instrument.instrument_type
                    if instrument else None
                ),
                "manufacturer": (
                    instrument.manufacturer
                    if instrument else None
                ),
                "model": (
                    instrument.model
                    if instrument else None
                ),
                "serial_number": (
                    instrument.serial_number
                    if instrument else None
                ),
                "capacity": (
                    instrument.capacity
                    if instrument else None
                ),
                "location": (
                    instrument.location
                    if instrument else None
                )
            }
        })

    return result


# =========================================================
# GET MY VERIFICATION REQUESTS
# SHOPKEEPER ONLY
# =========================================================

@router.get("/my")
def get_my_verification_requests(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "SHOPKEEPER":
        raise HTTPException(
            status_code=403,
            detail="Only shopkeepers can view their requests"
        )

    requests = (
        db.query(VerificationRequest)
        .join(
            Instrument,
            VerificationRequest.instrument_id == Instrument.id
        )
        .filter(
            Instrument.owner_id == current_user["user_id"]
        )
        .order_by(
            VerificationRequest.requested_at.desc()
        )
        .all()
    )

    result = []

    for request in requests:

        instrument = (
            db.query(Instrument)
            .filter(
                Instrument.id == request.instrument_id
            )
            .first()
        )

        result.append({
            "request_id": request.id,
            "application_id": request.application_id,
            "instrument_id": request.instrument_id,
            "status": request.status,
            "requested_at": request.requested_at,

            "instrument": {
                "unique_id": instrument.unique_id if instrument else None,
                "instrument_type": (
                    instrument.instrument_type
                    if instrument else None
                ),
                "manufacturer": (
                    instrument.manufacturer
                    if instrument else None
                ),
                "model": (
                    instrument.model
                    if instrument else None
                ),
                "serial_number": (
                    instrument.serial_number
                    if instrument else None
                )
            }
        })

    return result


# =========================================================
# GET SINGLE VERIFICATION REQUEST
# =========================================================

@router.get("/{request_id}")
def get_verification_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    request = (
        db.query(VerificationRequest)
        .filter(
            VerificationRequest.id == request_id
        )
        .first()
    )

    if not request:
        raise HTTPException(
            status_code=404,
            detail="Verification request not found"
        )

    instrument = (
        db.query(Instrument)
        .filter(
            Instrument.id == request.instrument_id
        )
        .first()
    )

    # SHOPKEEPER → only own instrument
    if current_user["role"] == "SHOPKEEPER":

        if (
            not instrument
            or instrument.owner_id != current_user["user_id"]
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have access to this request"
            )

    # INSPECTOR → allowed
    elif current_user["role"] != "INSPECTOR":

        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    return {
        "request_id": request.id,
        "application_id": request.application_id,
        "instrument_id": request.instrument_id,
        "status": request.status,
        "requested_at": request.requested_at,

        "instrument": {
            "unique_id": instrument.unique_id if instrument else None,
            "instrument_type": (
                instrument.instrument_type
                if instrument else None
            ),
            "manufacturer": (
                instrument.manufacturer
                if instrument else None
            ),
            "model": (
                instrument.model
                if instrument else None
            ),
            "serial_number": (
                instrument.serial_number
                if instrument else None
            ),
            "capacity": (
                instrument.capacity
                if instrument else None
            ),
            "location": (
                instrument.location
                if instrument else None
            )
        }
    }