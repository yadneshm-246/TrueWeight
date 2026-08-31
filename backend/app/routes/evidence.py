from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os
import shutil
import uuid

from app.database import get_db
from app.models.evidence import Evidence
from app.models.inspection import Inspection
from app.auth.security import get_current_user


router = APIRouter(
    prefix="/evidence",
    tags=["Evidence"]
)


UPLOAD_DIR = "uploads/evidence"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# Allowed proof file types
ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
}

# Maximum file size: 10 MB
MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/")
def upload_evidence(
    inspection_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    # Only inspectors can upload evidence
    if current_user["role"] != "INSPECTOR":
        raise HTTPException(
            status_code=403,
            detail="Only inspectors can upload evidence"
        )

    # Check inspection
    inspection = (
        db.query(Inspection)
        .filter(Inspection.id == inspection_id)
        .first()
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Inspection not found"
        )

    # Check file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG, WEBP and PDF files are allowed"
        )

    # Read file
    file_data = file.file.read()

    # Check file size
    if len(file_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size must be less than 10 MB"
        )

    # Create unique filename
    extension = os.path.splitext(file.filename or "")[1].lower()

    if not extension:
        extension = ".bin"

    unique_filename = (
        f"inspection_{inspection_id}_"
        f"{uuid.uuid4().hex}{extension}"
    )

    file_path = os.path.join(
        UPLOAD_DIR,
        unique_filename
    )

    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(file_data)

    # Save database record
    evidence = Evidence(
        inspection_id=inspection_id,
        file_path=file_path,
        file_type=file.content_type or "unknown"
    )

    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return {
        "message": "Evidence uploaded successfully",
        "evidence_id": evidence.id,
        "inspection_id": evidence.inspection_id,
        "file_path": evidence.file_path,
        "file_type": evidence.file_type
    }