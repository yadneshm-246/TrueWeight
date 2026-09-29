from pathlib import Path

from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.security import get_current_user

from app.models.evidence import Evidence
from app.models.inspection import Inspection


router = APIRouter(
    prefix="/evidence",
    tags=["Inspection Evidence"],
)

UPLOAD_DIR = Path("uploads/evidence")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_IMAGE_SIZE = 10 * 1024 * 1024
MAX_VIDEO_SIZE = 100 * 1024 * 1024

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

ALLOWED_VIDEO_TYPES = {
    "video/mp4",
    "video/webm",
    "video/quicktime",
}


def inspector_only(current_user: dict):
    if current_user["role"] != "INSPECTOR":
        raise HTTPException(
            status_code=403,
            detail="Only inspectors can upload evidence",
        )


@router.post("/upload")
async def upload_evidence(
    inspection_id: int = Form(...),
    evidence_type: str = Form(...),
    file: UploadFile = File(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    altitude: float | None = Form(None),
    location_accuracy: float | None = Form(None),
    location_timestamp: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    inspector_only(current_user)

    if evidence_type not in {
        "MACHINE_PHOTO",
        "READING_PHOTO",
        "INSPECTION_VIDEO",
    }:
        raise HTTPException(
            status_code=400,
            detail="Invalid evidence type",
        )

    inspection = (
        db.query(Inspection)
        .filter(Inspection.id == inspection_id)
        .first()
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Inspection not found",
        )

    # Only the inspector who performed the inspection can attach evidence.
    if inspection.inspector_id != current_user["user_id"]:
        raise HTTPException(
            status_code=403,
            detail="You can only upload evidence for your own inspection",
        )

    # Save the inspector's live GPS on the inspection as an additional
    # safeguard. This also repairs older inspections that were created
    # before GPS was being persisted.
    if latitude is not None or longitude is not None:
        if latitude is None or longitude is None:
            raise HTTPException(
                status_code=400,
                detail="Both latitude and longitude are required together",
            )

        if not -90 <= latitude <= 90:
            raise HTTPException(status_code=400, detail="Invalid latitude")

        if not -180 <= longitude <= 180:
            raise HTTPException(status_code=400, detail="Invalid longitude")

        if location_accuracy is not None and location_accuracy < 0:
            raise HTTPException(
                status_code=400,
                detail="Invalid location accuracy",
            )

        parsed_timestamp = None
        if location_timestamp:
            try:
                parsed_timestamp = datetime.fromisoformat(
                    location_timestamp.replace("Z", "+00:00")
                )
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid location timestamp",
                )

        # Do not overwrite an already-recorded inspection location.
        if inspection.latitude is None or inspection.longitude is None:
            inspection.latitude = latitude
            inspection.longitude = longitude
            inspection.altitude = altitude
            inspection.location_accuracy = location_accuracy
            inspection.location_timestamp = parsed_timestamp

    content_type = file.content_type or ""

    if evidence_type in {"MACHINE_PHOTO", "READING_PHOTO"}:
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Only JPG, PNG or WEBP images are allowed",
            )
        max_size = MAX_IMAGE_SIZE
    else:
        if content_type not in ALLOWED_VIDEO_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Only MP4, WebM or QuickTime videos are allowed",
            )
        max_size = MAX_VIDEO_SIZE

    data = await file.read()

    if len(data) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File is too large. Maximum allowed size is {max_size // (1024 * 1024)} MB.",
        )

    safe_name = Path(file.filename or "evidence").name
    stored_name = f"{inspection_id}_{current_user['user_id']}_{evidence_type}_{safe_name}"
    target = UPLOAD_DIR / stored_name
    target.write_bytes(data)

    record = Evidence(
        inspection_id=inspection_id,
        evidence_type=evidence_type,
        file_name=safe_name,
        file_path=str(target),
        content_type=content_type,
        uploaded_by=current_user["user_id"],
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": "Evidence uploaded successfully",
        "evidence_id": record.id,
        "inspection_id": record.inspection_id,
        "evidence_type": record.evidence_type,
        "file_name": record.file_name,
    }


@router.get("/{evidence_id}/file")
def get_evidence_file(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Officer can review all evidence; the inspector can review evidence
    # belonging to inspections they performed.
    if current_user["role"] not in {"OFFICER", "INSPECTOR"}:
        raise HTTPException(
            status_code=403,
            detail="Only officers and inspectors can view evidence",
        )

    record = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id)
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found",
        )

    inspection = (
        db.query(Inspection)
        .filter(Inspection.id == record.inspection_id)
        .first()
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Inspection for this evidence was not found",
        )

    if (
        current_user["role"] == "INSPECTOR"
        and inspection.inspector_id != current_user["user_id"]
    ):
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to view this evidence",
        )

    path = Path(record.file_path)

    if not path.exists() or not path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Evidence file is no longer available on the server",
        )

    return FileResponse(
        path=str(path),
        media_type=record.content_type or "application/octet-stream",
        filename=record.file_name,
    )
