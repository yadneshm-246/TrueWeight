from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.security import get_current_user

from app.models.user import User
from app.models.instrument import Instrument
from app.models.verification_request import VerificationRequest
from app.models.inspection import Inspection
from app.models.evidence import Evidence
from app.models.certificate import Certificate


router = APIRouter(
    prefix="/officer",
    tags=["Officer Case Detail"]
)


@router.get("/cases/{verification_request_id}")
def get_case_detail(
    verification_request_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    # Officer only
    if current_user["role"] != "OFFICER":
        raise HTTPException(
            status_code=403,
            detail="Only officers can view case details"
        )

    # Verification request
    verification_request = (
        db.query(VerificationRequest)
        .filter(
            VerificationRequest.id == verification_request_id
        )
        .first()
    )

    if not verification_request:
        raise HTTPException(
            status_code=404,
            detail="Verification request not found"
        )

    # Instrument
    instrument = (
        db.query(Instrument)
        .filter(
            Instrument.id == verification_request.instrument_id
        )
        .first()
    )

    # Inspection
    inspection = (
        db.query(Inspection)
        .filter(
            Inspection.verification_request_id
            == verification_request_id
        )
        .first()
    )

    # Merchant
    merchant = None

    if instrument and instrument.owner_id:
        merchant = (
            db.query(User)
            .filter(
                User.id == instrument.owner_id
            )
            .first()
        )

    # Inspector
    inspector = None

    if inspection and inspection.inspector_id:
        inspector = (
            db.query(User)
            .filter(
                User.id == inspection.inspector_id
            )
            .first()
        )

    # Evidence
    evidence = []

    if inspection:
        evidence_records = (
            db.query(Evidence)
            .filter(
                Evidence.inspection_id == inspection.id
            )
            .all()
        )

        evidence = [
            {
                "id": item.id,
                "type": item.evidence_type,
                "file_name": item.file_name,
                "content_type": item.content_type,
                "uploaded_by": item.uploaded_by,
                "uploaded_at": (
                    item.uploaded_at.isoformat()
                    if item.uploaded_at
                    else None
                )
            }
            for item in evidence_records
        ]

    # Certificate
    certificate = None

    if verification_request:
        certificate_record = (
            db.query(Certificate)
            .filter(
                Certificate.verification_request_id
                == verification_request_id
            )
            .first()
        )

        if certificate_record:
            certificate = {
                "id": certificate_record.id,
                "certificate_number":
                    certificate_record.certificate_number,
                "issued_at": (
                    certificate_record.issued_at.isoformat()
                    if certificate_record.issued_at
                    else None
                ),
                "valid_until": (
                    certificate_record.valid_until.isoformat()
                    if certificate_record.valid_until
                    else None
                )
            }

    return {
        "verification_request": {
            "id": verification_request.id,
            "application_id":
                verification_request.application_id,
            "status":
                verification_request.status,
            "requested_at": (
                verification_request.requested_at.isoformat()
                if verification_request.requested_at
                else None
            )
        },

        "merchant": (
            {
                "id": merchant.id,
                "name": getattr(
                    merchant,
                    "name",
                    None
                ),
                "email": getattr(
                    merchant,
                    "email",
                    None
                )
            }
            if merchant
            else None
        ),

        "instrument": (
            {
                "id": instrument.id,
                "unique_id":
                    instrument.unique_id,
                "instrument_type":
                    instrument.instrument_type,
                "manufacturer":
                    instrument.manufacturer,
                "model":
                    instrument.model,
                "serial_number":
                    instrument.serial_number,
                "capacity":
                    instrument.capacity,
                "location":
                    instrument.location
            }
            if instrument
            else None
        ),

        "inspector": (
            {
                "id": inspector.id,
                "name": getattr(
                    inspector,
                    "name",
                    None
                ),
                "email": getattr(
                    inspector,
                    "email",
                    None
                )
            }
            if inspector
            else None
        ),

        "inspection": (
            {
                "id": inspection.id,
                "standard_weight":
                    inspection.standard_weight,
                "machine_reading":
                    inspection.machine_reading,
                "calculated_error":
                    inspection.calculated_error,
                "permissible_error":
                    inspection.permissible_error,
                "result":
                    inspection.result,
                "remarks":
                    inspection.remarks,

                "location": {
                    "latitude":
                        inspection.latitude,
                    "longitude":
                        inspection.longitude,
                    "altitude":
                        inspection.altitude,
                    "accuracy":
                        inspection.location_accuracy,
                    "timestamp": (
                        inspection.location_timestamp.isoformat()
                        if inspection.location_timestamp
                        else None
                    )
                }
            }
            if inspection
            else None
        ),

        "evidence": evidence,

        "certificate": certificate
    }