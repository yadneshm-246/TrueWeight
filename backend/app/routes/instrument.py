from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.instrument import Instrument
from app.auth.security import get_current_user


router = APIRouter(
    prefix="/instruments",
    tags=["Instruments"]
)


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
    current_user: dict = Depends(get_current_user)
):
    # Only shopkeepers can register instruments
    if current_user["role"] != "SHOPKEEPER":
        raise HTTPException(
            status_code=403,
            detail="Only shopkeepers can register instruments"
        )

    # Check unique_id
    existing_unique_id = (
        db.query(Instrument)
        .filter(Instrument.unique_id == unique_id)
        .first()
    )

    if existing_unique_id:
        raise HTTPException(
            status_code=400,
            detail="Unique ID already exists"
        )

    # Check serial number
    existing_serial = (
        db.query(Instrument)
        .filter(Instrument.serial_number == serial_number)
        .first()
    )

    if existing_serial:
        raise HTTPException(
            status_code=400,
            detail="Serial number already exists"
        )

    # Create instrument
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


@router.get("/")
def get_instruments(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    instruments = (
        db.query(Instrument)
        .filter(Instrument.owner_id == current_user["user_id"])
        .all()
    )

    return instruments


@router.get("/{instrument_id}")
def get_instrument(
    instrument_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
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