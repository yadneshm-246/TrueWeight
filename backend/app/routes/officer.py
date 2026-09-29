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
    tags=["Officer Dashboard"]
)


def officer_only(current_user):
    if current_user["role"] != "OFFICER":
        raise HTTPException(
            status_code=403,
            detail="Only officers can access this dashboard"
        )


@router.get("/dashboard")
def officer_dashboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    officer_only(current_user)

    requests = (
        db.query(VerificationRequest)
        .order_by(VerificationRequest.requested_at.desc())
        .all()
    )

    cases = []

    for request in requests:

        instrument = (
            db.query(Instrument)
            .filter(Instrument.id == request.instrument_id)
            .first()
        )

        merchant = None
        if instrument and instrument.owner_id:
            merchant = (
                db.query(User)
                .filter(User.id == instrument.owner_id)
                .first()
            )

        inspection = (
            db.query(Inspection)
            .filter(
                Inspection.verification_request_id == request.id
            )
            .order_by(Inspection.inspected_at.desc())
            .first()
        )

        inspector = None

        if inspection and inspection.inspector_id:
            inspector = (
                db.query(User)
                .filter(User.id == inspection.inspector_id)
                .first()
            )

        evidence_count = 0

        if inspection:
            evidence_count = (
                db.query(Evidence)
                .filter(
                    Evidence.inspection_id == inspection.id
                )
                .count()
            )

        certificate = (
            db.query(Certificate)
            .filter(
                Certificate.verification_request_id == request.id
            )
            .first()
        )

        cases.append({
            "request_id": request.id,
            "application_id": request.application_id,
            "status": request.status,
            "requested_at": (
                request.requested_at.isoformat()
                if request.requested_at
                else None
            ),

            "merchant": (
                {
                    "id": merchant.id,
                    "name": getattr(merchant, "name", None),
                    "email": getattr(merchant, "email", None)
                }
                if merchant else None
            ),

            "instrument": (
                {
                    "id": instrument.id,
                    "unique_id": instrument.unique_id,
                    "instrument_type": instrument.instrument_type,
                    "manufacturer": instrument.manufacturer,
                    "model": instrument.model,
                    "serial_number": instrument.serial_number,
                    "capacity": instrument.capacity,
                    "location": instrument.location
                }
                if instrument else None
            ),

            "inspector": (
                {
                    "id": inspector.id,
                    "name": getattr(inspector, "name", None),
                    "email": getattr(inspector, "email", None)
                }
                if inspector else None
            ),

            "inspection": (
                {
                    "id": inspection.id,
                    "standard_weight": inspection.standard_weight,
                    "machine_reading": inspection.machine_reading,
                    "calculated_error": inspection.calculated_error,
                    "permissible_error": inspection.permissible_error,
                    "result": inspection.result,
                    "remarks": inspection.remarks,
                    "inspected_at": (
                        inspection.inspected_at.isoformat()
                        if inspection.inspected_at
                        else None
                    ),

                    "location": {
                        "latitude": inspection.latitude,
                        "longitude": inspection.longitude,
                        "altitude": inspection.altitude,
                        "accuracy": inspection.location_accuracy,
                        "timestamp": (
                            inspection.location_timestamp.isoformat()
                            if inspection.location_timestamp
                            else None
                        )
                    }
                }
                if inspection else None
            ),

            "evidence_count": evidence_count,

            "certificate": (
                {
                    "id": certificate.id,
                    "certificate_number":
                        certificate.certificate_number,
                    "issued_at": (
                        certificate.issued_at.isoformat()
                        if certificate.issued_at
                        else None
                    ),
                    "valid_until": (
                        certificate.valid_until.isoformat()
                        if certificate.valid_until
                        else None
                    )
                }
                if certificate else None
            )
        })

    return {
        "total": len(cases),
        "pending": sum(
            1 for c in cases if c["status"] == "PENDING"
        ),
        "verified": sum(
            1 for c in cases if c["status"] == "VERIFIED"
        ),
        "rejected": sum(
            1 for c in cases if c["status"] == "REJECTED"
        ),
        "cases": cases
    }


@router.get("/cases/{verification_request_id}")
def officer_case_detail(
    verification_request_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    officer_only(current_user)

    request = (
        db.query(VerificationRequest)
        .filter(
            VerificationRequest.id == verification_request_id
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
        .filter(Instrument.id == request.instrument_id)
        .first()
    )

    merchant = None

    if instrument and instrument.owner_id:
        merchant = (
            db.query(User)
            .filter(User.id == instrument.owner_id)
            .first()
        )

    inspection = (
        db.query(Inspection)
        .filter(
            Inspection.verification_request_id
            == verification_request_id
        )
        .order_by(Inspection.inspected_at.desc())
        .first()
    )

    inspector = None

    if inspection:
        inspector = (
            db.query(User)
            .filter(
                User.id == inspection.inspector_id
            )
            .first()
        )

    evidence = []

    if inspection:
        records = (
            db.query(Evidence)
            .filter(
                Evidence.inspection_id == inspection.id
            )
            .order_by(Evidence.uploaded_at.desc())
            .all()
        )

        for item in records:
            evidence.append({
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
            })

    certificate = (
        db.query(Certificate)
        .filter(
            Certificate.verification_request_id
            == verification_request_id
        )
        .first()
    )

    return {
        "verification_request": {
            "id": request.id,
            "application_id": request.application_id,
            "status": request.status,
            "requested_at": (
                request.requested_at.isoformat()
                if request.requested_at
                else None
            )
        },

        "merchant": (
            {
                "id": merchant.id,
                "name": getattr(merchant, "name", None),
                "email": getattr(merchant, "email", None)
            }
            if merchant else None
        ),

        "instrument": (
            {
                "id": instrument.id,
                "unique_id": instrument.unique_id,
                "instrument_type": instrument.instrument_type,
                "manufacturer": instrument.manufacturer,
                "model": instrument.model,
                "serial_number": instrument.serial_number,
                "capacity": instrument.capacity,
                "location": instrument.location
            }
            if instrument else None
        ),

        "inspector": (
            {
                "id": inspector.id,
                "name": getattr(inspector, "name", None),
                "email": getattr(inspector, "email", None)
            }
            if inspector else None
        ),

        "inspection": (
            {
                "id": inspection.id,
                "standard_weight": inspection.standard_weight,
                "machine_reading": inspection.machine_reading,
                "calculated_error": inspection.calculated_error,
                "permissible_error": inspection.permissible_error,
                "result": inspection.result,
                "remarks": inspection.remarks,
                "inspected_at": (
                    inspection.inspected_at.isoformat()
                    if inspection.inspected_at
                    else None
                ),

                "location": {
                    "latitude": inspection.latitude,
                    "longitude": inspection.longitude,
                    "altitude": inspection.altitude,
                    "accuracy": inspection.location_accuracy,
                    "timestamp": (
                        inspection.location_timestamp.isoformat()
                        if inspection.location_timestamp
                        else None
                    )
                }
            }
            if inspection else None
        ),

        "evidence": evidence,

        "certificate": (
            {
                "id": certificate.id,
                "certificate_number":
                    certificate.certificate_number,
                "issued_at": (
                    certificate.issued_at.isoformat()
                    if certificate.issued_at
                    else None
                ),
                "valid_until": (
                    certificate.valid_until.isoformat()
                    if certificate.valid_until
                    else None
                )
            }
            if certificate else None
        )
    }