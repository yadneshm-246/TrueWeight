from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse

import uuid
import os
import qrcode

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.database import get_db
from app.models.certificate import Certificate
from app.models.verification_request import VerificationRequest
from app.models.inspection import Inspection
from app.models.instrument import Instrument
from app.auth.security import get_current_user


router = APIRouter(
    prefix="/certificate",
    tags=["Certificate"]
)


CERTIFICATE_DIR = "uploads/certificates"
QR_DIR = "uploads/qr"

os.makedirs(CERTIFICATE_DIR, exist_ok=True)
os.makedirs(QR_DIR, exist_ok=True)


# =========================================================
# GENERATE CERTIFICATE
# =========================================================

@router.post("/")
def generate_certificate(
    verification_request_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    # Only inspectors can generate certificates
    if current_user["role"] != "INSPECTOR":
        raise HTTPException(
            status_code=403,
            detail="Only inspectors can generate certificates"
        )

    # -----------------------------------------------------
    # CHECK VERIFICATION REQUEST
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # CHECK INSPECTION
    # -----------------------------------------------------

    inspection = (
        db.query(Inspection)
        .filter(
            Inspection.verification_request_id
            == verification_request_id
        )
        .first()
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Inspection not found"
        )

    # -----------------------------------------------------
    # CERTIFICATE ONLY FOR PASS
    # -----------------------------------------------------

    if inspection.result != "PASS":
        raise HTTPException(
            status_code=400,
            detail="Certificate cannot be generated for failed inspection"
        )

    # -----------------------------------------------------
    # CHECK INSTRUMENT
    # -----------------------------------------------------

    instrument = (
        db.query(Instrument)
        .filter(
            Instrument.id == request.instrument_id
        )
        .first()
    )

    if not instrument:
        raise HTTPException(
            status_code=404,
            detail="Instrument not found"
        )

    # =====================================================
    # CREATE CERTIFICATE NUMBER
    # =====================================================

    certificate_number = (
        "TW-CERT-" + uuid.uuid4().hex[:8].upper()
    )

    # =====================================================
    # QR CODE
    # =====================================================
    #
    # IMPORTANT:
    # QR opens the React frontend verification page.
    #
    # PC:
    # http://localhost:5173
    #
    # Mobile:
    # http://192.168.29.48:5173
    #
    # Therefore we use the LAN IP here.
    #

    verification_url = (
    f"http://192.168.29.127:5173/verify/"
    f"{certificate_number}"
)

    qr = qrcode.make(verification_url)

    qr_filename = f"{certificate_number}.png"

    qr_path = os.path.join(
        QR_DIR,
        qr_filename
    )

    qr.save(qr_path)

    # =====================================================
    # PDF CERTIFICATE
    # =====================================================

    pdf_filename = f"{certificate_number}.pdf"

    pdf_path = os.path.join(
        CERTIFICATE_DIR,
        pdf_filename
    )

    pdf = canvas.Canvas(
        pdf_path,
        pagesize=A4
    )

    width, height = A4

    # -----------------------------------------------------
    # TITLE
    # -----------------------------------------------------

    pdf.setFont("Helvetica-Bold", 24)

    pdf.drawCentredString(
        width / 2,
        height - 80,
        "TRUEWEIGHT"
    )

    pdf.setFont("Helvetica-Bold", 18)

    pdf.drawCentredString(
        width / 2,
        height - 115,
        "VERIFICATION CERTIFICATE"
    )

    # -----------------------------------------------------
    # CERTIFICATE NUMBER
    # -----------------------------------------------------

    pdf.setFont("Helvetica-Bold", 12)

    pdf.drawString(
        60,
        height - 165,
        f"Certificate Number: {certificate_number}"
    )

    # -----------------------------------------------------
    # DETAILS
    # -----------------------------------------------------

    pdf.setFont("Helvetica", 11)

    y = height - 205

    details = [
        f"Verification Request ID: {verification_request_id}",
        f"Inspection ID: {inspection.id}",
        f"Instrument ID: {instrument.id}",
        f"Instrument Type: {instrument.instrument_type}",
        f"Manufacturer: {instrument.manufacturer}",
        f"Model: {instrument.model}",
        f"Serial Number: {instrument.serial_number}",
        f"Capacity: {instrument.capacity}",
        f"Location: {instrument.location}",
        f"Standard Weight: {inspection.standard_weight}",
        f"Machine Reading: {inspection.machine_reading}",
        f"Calculated Error: {inspection.calculated_error}",
        f"Permissible Error: {inspection.permissible_error}",
        f"Result: {inspection.result}",
    ]

    for detail in details:

        pdf.drawString(
            70,
            y,
            detail
        )

        y -= 25

    # -----------------------------------------------------
    # REMARKS
    # -----------------------------------------------------

    pdf.setFont("Helvetica-Bold", 11)

    pdf.drawString(
        70,
        y - 5,
        "Remarks:"
    )

    pdf.setFont("Helvetica", 11)

    pdf.drawString(
        70,
        y - 25,
        inspection.remarks or "No remarks"
    )

    # -----------------------------------------------------
    # QR CODE
    # -----------------------------------------------------

    pdf.drawImage(
        qr_path,
        width - 180,
        80,
        width=100,
        height=100
    )

    # -----------------------------------------------------
    # FOOTER
    # -----------------------------------------------------

    pdf.setFont("Helvetica", 9)

    pdf.drawString(
        60,
        50,
        "Generated by TrueWeight Verification Platform"
    )

    pdf.save()

    # =====================================================
    # DATABASE RECORD
    # =====================================================

    certificate = Certificate(
        certificate_number=certificate_number,
        verification_request_id=verification_request_id,
        certificate_file=pdf_path,
        qr_code=qr_path
    )

    db.add(certificate)

    db.commit()

    db.refresh(certificate)

    # =====================================================
    # RESPONSE
    # =====================================================

    return {
        "message": "Certificate generated successfully",
        "certificate_id": certificate.id,
        "certificate_number": certificate.certificate_number,
        "verification_request_id": certificate.verification_request_id,
        "inspection_id": inspection.id,
        "result": inspection.result,
        "certificate_file": certificate.certificate_file,
        "qr_code": certificate.qr_code,
        "verification_url": verification_url,
        "issued_at": certificate.issued_at
    }


# =========================================================
# VERIFY CERTIFICATE
# IMPORTANT: KEEP BEFORE /{certificate_number}
# =========================================================

@router.get("/verify/{certificate_number}")
def verify_certificate(
    certificate_number: str,
    db: Session = Depends(get_db)
):

    certificate = (
        db.query(Certificate)
        .filter(
            Certificate.certificate_number
            == certificate_number
        )
        .first()
    )

    if not certificate:
        raise HTTPException(
            status_code=404,
            detail="Certificate not found"
        )

    return {
        "verified": True,
        "status": "VALID",
        "certificate_number": certificate.certificate_number,
        "certificate_id": certificate.id,
        "verification_request_id": certificate.verification_request_id,
        "issued_at": certificate.issued_at,
        "valid_until": certificate.valid_until
    }


# =========================================================
# DOWNLOAD CERTIFICATE PDF
# =========================================================

@router.get("/{certificate_number}/pdf")
def download_certificate(
    certificate_number: str,
    db: Session = Depends(get_db)
):

    certificate = (
        db.query(Certificate)
        .filter(
            Certificate.certificate_number
            == certificate_number
        )
        .first()
    )

    if not certificate:
        raise HTTPException(
            status_code=404,
            detail="Certificate not found"
        )

    if not certificate.certificate_file:
        raise HTTPException(
            status_code=404,
            detail="Certificate PDF not available"
        )

    if not os.path.exists(certificate.certificate_file):
        raise HTTPException(
            status_code=404,
            detail="Certificate PDF file not found"
        )

    return FileResponse(
        path=certificate.certificate_file,
        media_type="application/pdf",
        filename=f"{certificate.certificate_number}.pdf"
    )


# =========================================================
# GET CERTIFICATE DETAILS
# IMPORTANT: KEEP THIS LAST
# =========================================================

@router.get("/{certificate_number}")
def get_certificate(
    certificate_number: str,
    db: Session = Depends(get_db)
):

    certificate = (
        db.query(Certificate)
        .filter(
            Certificate.certificate_number
            == certificate_number
        )
        .first()
    )

    if not certificate:
        raise HTTPException(
            status_code=404,
            detail="Certificate not found"
        )

    return {
        "certificate_id": certificate.id,
        "certificate_number": certificate.certificate_number,
        "verification_request_id": certificate.verification_request_id,
        "certificate_file": certificate.certificate_file,
        "qr_code": certificate.qr_code,
        "issued_at": certificate.issued_at,
        "valid_until": certificate.valid_until,
        "status": "VALID"
    }