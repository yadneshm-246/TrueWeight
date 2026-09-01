import os

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.instrument import Instrument
from app.models.verification_request import VerificationRequest
from app.models.inspection import Inspection
from app.models.certificate import Certificate
from app.auth.security import get_current_user


router = APIRouter(
    prefix="/instruments",
    tags=["Instruments"]
)


# ============================================================
# CREATE INSTRUMENT
# ============================================================

@router.post("/")
def create_instrument(
    unique_id: str,
    instrument_type: str,
    manufacturer: str,
    model: str,
    serial_number: str,
    capacity: str,
    location: str,
    purchase_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):

    # ONLY SHOPKEEPER
    if current_user["role"] != "SHOPKEEPER":
        raise HTTPException(
            status_code=403,
            detail="Only shopkeepers can register instruments"
        )

    # CHECK UNIQUE ID
    existing_unique_id = (
        db.query(Instrument)
        .filter(
            Instrument.unique_id == unique_id
        )
        .first()
    )

    if existing_unique_id:
        raise HTTPException(
            status_code=400,
            detail="Unique ID already exists"
        )

    # CHECK SERIAL NUMBER
    existing_serial = (
        db.query(Instrument)
        .filter(
            Instrument.serial_number == serial_number
        )
        .first()
    )

    if existing_serial:
        raise HTTPException(
            status_code=400,
            detail="Serial number already exists"
        )

    # CREATE INSTRUMENT
    instrument = Instrument(
        unique_id=unique_id,
        instrument_type=instrument_type,
        manufacturer=manufacturer,
        model=model,
        serial_number=serial_number,
        capacity=capacity,
        location=location,
        purchase_date=purchase_date,
        owner_id=current_user["user_id"]
    )

    db.add(instrument)
    db.commit()
    db.refresh(instrument)

    return {
        "message": "Instrument created successfully",
        "instrument_id": instrument.id,
        "unique_id": instrument.unique_id,
        "serial_number": instrument.serial_number,
        "owner_id": instrument.owner_id
    }


# ============================================================
# GET MY INSTRUMENTS
# ============================================================

@router.get("/")
def get_instruments(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):

    instruments = (
        db.query(Instrument)
        .filter(
            Instrument.owner_id == current_user["user_id"]
        )
        .all()
    )

    return instruments


# ============================================================
# GET SINGLE INSTRUMENT
# ============================================================

@router.get("/{instrument_id}")
def get_instrument(
    instrument_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):

    instrument = (
        db.query(Instrument)
        .filter(
            Instrument.id == instrument_id,
            Instrument.owner_id == current_user["user_id"]
        )
        .first()
    )

    if not instrument:
        raise HTTPException(
            status_code=404,
            detail="Instrument not found"
        )

    return instrument


# ============================================================
# DELETE INSTRUMENT
# SHOPKEEPER ONLY
# ============================================================

@router.delete("/{instrument_id}")
def delete_instrument(
    instrument_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):

    # ========================================================
    # ONLY SHOPKEEPER
    # ========================================================

    if current_user["role"] != "SHOPKEEPER":
        raise HTTPException(
            status_code=403,
            detail="Only shopkeepers can delete instruments"
        )

    # ========================================================
    # FIND INSTRUMENT
    # ========================================================

    instrument = (
        db.query(Instrument)
        .filter(
            Instrument.id == instrument_id,
            Instrument.owner_id == current_user["user_id"]
        )
        .first()
    )

    if not instrument:
        raise HTTPException(
            status_code=404,
            detail="Instrument not found"
        )

    try:

        # ====================================================
        # FIND VERIFICATION REQUESTS
        # ====================================================

        requests = (
            db.query(VerificationRequest)
            .filter(
                VerificationRequest.instrument_id == instrument.id
            )
            .all()
        )

        # ====================================================
        # DELETE ALL RELATED DATA
        # ====================================================

        for request in requests:

            # ------------------------------------------------
            # DELETE CERTIFICATES
            # ------------------------------------------------

            certificates = (
                db.query(Certificate)
                .filter(
                    Certificate.verification_request_id == request.id
                )
                .all()
            )

            for certificate in certificates:

                # DELETE CERTIFICATE PDF FILE
                if certificate.certificate_file:

                    try:
                        if os.path.exists(
                            certificate.certificate_file
                        ):
                            os.remove(
                                certificate.certificate_file
                            )
                    except Exception:
                        pass

                # DELETE QR CODE FILE
                if certificate.qr_code:

                    try:
                        if os.path.exists(
                            certificate.qr_code
                        ):
                            os.remove(
                                certificate.qr_code
                            )
                    except Exception:
                        pass

                # DELETE CERTIFICATE DATABASE RECORD
                db.delete(certificate)

            # ------------------------------------------------
            # DELETE INSPECTIONS
            # ------------------------------------------------

            inspections = (
                db.query(Inspection)
                .filter(
                    Inspection.verification_request_id == request.id
                )
                .all()
            )

            for inspection in inspections:
                db.delete(inspection)

            # ------------------------------------------------
            # DELETE VERIFICATION REQUEST
            # ------------------------------------------------

            db.delete(request)

        # ====================================================
        # IMPORTANT
        # FLUSH CHILD RECORD DELETIONS FIRST
        # ====================================================

        db.flush()

        # ====================================================
        # DELETE INSTRUMENT
        # ====================================================

        db.delete(instrument)

        # ====================================================
        # FINAL COMMIT
        # ====================================================

        db.commit()

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete instrument: {str(error)}"
        )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "message": "Instrument deleted successfully",
        "instrument_id": instrument_id
    }