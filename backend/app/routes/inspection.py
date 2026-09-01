from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.inspection import Inspection
from app.models.verification_request import VerificationRequest
from app.auth.security import get_current_user


router = APIRouter(
    prefix="/inspection",
    tags=["Inspection"]
)


# =========================================================
# CREATE INSPECTION
# INSPECTOR ONLY
# =========================================================

@router.post("/")
def create_inspection(
    verification_request_id: int,
    standard_weight: float,
    machine_reading: float,
    permissible_error: float,
    remarks: str | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] != "INSPECTOR":
        raise HTTPException(
            status_code=403,
            detail="Only inspectors can perform inspections"
        )

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

    if verification_request.status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail="Verification request is not pending"
        )

    calculated_error = abs(
        machine_reading - standard_weight
    )

    if calculated_error <= permissible_error:
        result = "PASS"
    else:
        result = "FAIL"

    inspection = Inspection(
        verification_request_id=verification_request_id,
        standard_weight=standard_weight,
        machine_reading=machine_reading,
        calculated_error=calculated_error,
        permissible_error=permissible_error,
        result=result,
        inspector_id=current_user["user_id"],
        remarks=remarks
    )

    db.add(inspection)

    if result == "PASS":
        verification_request.status = "VERIFIED"
    else:
        verification_request.status = "REJECTED"

    db.commit()
    db.refresh(inspection)

    return {
        "message": "Inspection completed successfully",
        "inspection_id": inspection.id,
        "verification_request_id": inspection.verification_request_id,
        "standard_weight": inspection.standard_weight,
        "machine_reading": inspection.machine_reading,
        "calculated_error": inspection.calculated_error,
        "permissible_error": inspection.permissible_error,
        "result": inspection.result,
        "inspector_id": inspection.inspector_id,
        "remarks": inspection.remarks
    }


# =========================================================
# GET SINGLE INSPECTION
# =========================================================

@router.get("/{inspection_id}")
def get_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    inspection = (
        db.query(Inspection)
        .filter(
            Inspection.id == inspection_id
        )
        .first()
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Inspection not found"
        )

    return {
        "inspection_id": inspection.id,
        "verification_request_id": inspection.verification_request_id,
        "standard_weight": inspection.standard_weight,
        "machine_reading": inspection.machine_reading,
        "calculated_error": inspection.calculated_error,
        "permissible_error": inspection.permissible_error,
        "result": inspection.result,
        "inspector_id": inspection.inspector_id,
        "remarks": inspection.remarks,
        "inspected_at": inspection.inspected_at
    }