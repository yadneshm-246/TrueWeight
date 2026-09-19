from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse

import uuid
import os
import qrcode

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

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


# =========================================================
# DIRECTORIES
# =========================================================

CERTIFICATE_DIR = "uploads/certificates"
QR_DIR = "uploads/qr"

os.makedirs(CERTIFICATE_DIR, exist_ok=True)
os.makedirs(QR_DIR, exist_ok=True)


# =========================================================
# FRONTEND URL
# =========================================================

FRONTEND_URL = "http://10.23.93.59:5173"

# =========================================================
# GENERATE CERTIFICATE
# =========================================================

@router.post("/")
def generate_certificate(
    verification_request_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    # =====================================================
    # ONLY INSPECTOR
    # =====================================================

    if current_user["role"] != "INSPECTOR":
        raise HTTPException(
            status_code=403,
            detail="Only inspectors can generate certificates"
        )

    # =====================================================
    # CHECK VERIFICATION REQUEST
    # =====================================================

    request = (
        db.query(VerificationRequest)
        .filter(
            VerificationRequest.id
            == verification_request_id
        )
        .first()
    )

    if not request:
        raise HTTPException(
            status_code=404,
            detail="Verification request not found"
        )

    # =====================================================
    # CHECK INSPECTION
    # =====================================================

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

    # =====================================================
    # ONLY PASS
    # =====================================================

    if inspection.result != "PASS":
        raise HTTPException(
            status_code=400,
            detail="Certificate cannot be generated for failed inspection"
        )

    # =====================================================
    # CHECK INSTRUMENT
    # =====================================================

    instrument = (
        db.query(Instrument)
        .filter(
            Instrument.id
            == request.instrument_id
        )
        .first()
    )

    if not instrument:
        raise HTTPException(
            status_code=404,
            detail="Instrument not found"
        )

    # =====================================================
    # CERTIFICATE NUMBER
    # =====================================================

    certificate_number = (
        "TW-CERT-"
        + uuid.uuid4().hex[:8].upper()
    )

    # =====================================================
    # VERIFICATION URL
    # =====================================================

    verification_url = (
        f"{FRONTEND_URL}/verify/"
        f"{certificate_number}"
    )

    # =====================================================
    # CREATE QR CODE
    # =====================================================

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=4,
    )

    qr.add_data(verification_url)
    qr.make(fit=True)

    qr_image = qr.make_image(
        fill_color="black",
        back_color="white"
    )

    qr_filename = (
        f"{certificate_number}.png"
    )

    qr_path = os.path.join(
        QR_DIR,
        qr_filename
    )

    qr_image.save(qr_path)

    # =====================================================
    # VERIFY QR FILE EXISTS
    # =====================================================

    if not os.path.exists(qr_path):
        raise HTTPException(
            status_code=500,
            detail="QR code could not be generated"
        )

    # =====================================================
    # PDF PATH
    # =====================================================

    pdf_filename = (
        f"{certificate_number}.pdf"
    )

    pdf_path = os.path.join(
        CERTIFICATE_DIR,
        pdf_filename
    )

    # =====================================================
    # CREATE PDF
    # =====================================================

    pdf = canvas.Canvas(
        pdf_path,
        pagesize=A4
    )

    width, height = A4

    # =====================================================
    # BORDER
    # =====================================================

    pdf.setLineWidth(2)

    pdf.rect(
        35,
        35,
        width - 70,
        height - 70
    )

    # =====================================================
    # TITLE
    # =====================================================

    pdf.setFont(
        "Helvetica-Bold",
        24
    )

    pdf.drawCentredString(
        width / 2,
        height - 80,
        "TRUEWEIGHT"
    )

    pdf.setFont(
        "Helvetica-Bold",
        18
    )

    pdf.drawCentredString(
        width / 2,
        height - 115,
        "VERIFICATION CERTIFICATE"
    )

    # =====================================================
    # CERTIFICATE NUMBER
    # =====================================================

    pdf.setFont(
        "Helvetica-Bold",
        12
    )

    pdf.drawString(
        60,
        height - 165,
        f"Certificate Number: {certificate_number}"
    )

    # =====================================================
    # DETAILS
    # =====================================================

    pdf.setFont(
        "Helvetica",
        10
    )

    y = height - 205

    details = [

        f"Verification Request ID: "
        f"{verification_request_id}",

        f"Inspection ID: "
        f"{inspection.id}",

        f"Instrument ID: "
        f"{instrument.id}",

        f"Instrument Type: "
        f"{instrument.instrument_type}",

        f"Manufacturer: "
        f"{instrument.manufacturer}",

        f"Model: "
        f"{instrument.model}",

        f"Serial Number: "
        f"{instrument.serial_number}",

        f"Capacity: "
        f"{instrument.capacity}",

        f"Location: "
        f"{instrument.location}",

        f"Standard Weight: "
        f"{inspection.standard_weight} kg",

        f"Machine Reading: "
        f"{inspection.machine_reading} kg",

        f"Calculated Error: "
        f"{inspection.calculated_error} kg",

        f"Permissible Error: "
        f"{inspection.permissible_error} kg",

        f"Result: "
        f"{inspection.result}",
    ]

    for detail in details:

        pdf.drawString(
            70,
            y,
            detail
        )

        y -= 22

    # =====================================================
    # REMARKS
    # =====================================================

    pdf.setFont(
        "Helvetica-Bold",
        11
    )

    pdf.drawString(
        70,
        y - 5,
        "Remarks:"
    )

    pdf.setFont(
        "Helvetica",
        10
    )

    remarks = (
        inspection.remarks
        or "No remarks"
    )

    pdf.drawString(
        70,
        y - 25,
        remarks[:90]
    )

    # =====================================================
    # QR CODE SECTION
    # =====================================================

    qr_x = width - 190
    qr_y = 80
    qr_size = 120

    # QR BOX
    pdf.setLineWidth(1)

    pdf.rect(
        qr_x - 10,
        qr_y - 35,
        qr_size + 20,
        qr_size + 55
    )

    # QR IMAGE
    pdf.drawImage(
        ImageReader(qr_path),
        qr_x,
        qr_y,
        width=qr_size,
        height=qr_size,
        preserveAspectRatio=True,
        anchor="sw",
        mask="auto"
    )

    # QR LABEL
    pdf.setFont(
        "Helvetica-Bold",
        9
    )

    pdf.drawCentredString(
        qr_x + qr_size / 2,
        qr_y - 18,
        "SCAN TO VERIFY"
    )

    # =====================================================
    # VERIFICATION URL
    # =====================================================

    pdf.setFont(
        "Helvetica",
        7
    )

    # Short URL shown on certificate
    pdf.drawCentredString(
        qr_x + qr_size / 2,
        qr_y - 29,
        f"{FRONTEND_URL}/verify/"
    )

    # =====================================================
    # RESULT
    # =====================================================

    pdf.setFont(
        "Helvetica-Bold",
        14
    )

    pdf.drawString(
        70,
        150,
        f"VERIFICATION RESULT: {inspection.result}"
    )

    # =====================================================
    # FOOTER
    # =====================================================

    pdf.setFont(
        "Helvetica",
        8
    )

    pdf.drawString(
        60,
        50,
        "Generated by TrueWeight Verification Platform"
    )

    pdf.save()

    # =====================================================
    # CHECK PDF
    # =====================================================

    if not os.path.exists(pdf_path):
        raise HTTPException(
            status_code=500,
            detail="Certificate PDF could not be generated"
        )

    # =====================================================
    # DATABASE RECORD
    # =====================================================

    certificate = Certificate(
        certificate_number=certificate_number,

        verification_request_id=
            verification_request_id,

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
        "message":
            "Certificate generated successfully",

        "certificate_id":
            certificate.id,

        "certificate_number":
            certificate.certificate_number,

        "verification_request_id":
            certificate.verification_request_id,

        "inspection_id":
            inspection.id,

        "result":
            inspection.result,

        "certificate_file":
            certificate.certificate_file,

        "qr_code":
            certificate.qr_code,

        "verification_url":
            verification_url,

        "issued_at":
            certificate.issued_at
    }


# =========================================================
# VERIFY CERTIFICATE
# IMPORTANT:
# KEEP BEFORE /{certificate_number}
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

        "certificate_number":
            certificate.certificate_number,

        "certificate_id":
            certificate.id,

        "verification_request_id":
            certificate.verification_request_id,

        "issued_at":
            certificate.issued_at,

        "valid_until":
            certificate.valid_until
    }


# =========================================================
# DOWNLOAD CERTIFICATE PDF
# =========================================================
# =========================================================
# GET MY CERTIFICATES
# IMPORTANT:
# KEEP THIS BEFORE /{certificate_number}
# =========================================================

@router.get("/my")
def get_my_certificates(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    # =====================================================
    # ONLY SHOPKEEPER
    # =====================================================

    if current_user["role"] != "SHOPKEEPER":
        raise HTTPException(
            status_code=403,
            detail="Only shopkeepers can view their certificates"
        )

    # =====================================================
    # GET SHOPKEEPER USER ID
    # =====================================================

    user_id = current_user["user_id"]

    # =====================================================
    # CERTIFICATE
    # → VERIFICATION REQUEST
    # → INSTRUMENT
    # → INSTRUMENT OWNER
    # =====================================================

    certificates = (
        db.query(Certificate)
        .join(
            VerificationRequest,
            Certificate.verification_request_id
            == VerificationRequest.id
        )
        .join(
            Instrument,
            VerificationRequest.instrument_id
            == Instrument.id
        )
        .filter(
            Instrument.owner_id == user_id
        )
        .all()
    )

    # =====================================================
    # RESPONSE
    # =====================================================

    return [
        {
            "certificate_id": certificate.id,

            "certificate_number":
                certificate.certificate_number,

            "verification_request_id":
                certificate.verification_request_id,

            "certificate_file":
                certificate.certificate_file,

            "qr_code":
                certificate.qr_code,

            "issued_at":
                certificate.issued_at,

            "valid_until":
                certificate.valid_until,

            "status":
                "VALID"
        }
        for certificate in certificates
    ]



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

    if not os.path.exists(
        certificate.certificate_file
    ):
        raise HTTPException(
            status_code=404,
            detail="Certificate PDF file not found"
        )

    return FileResponse(
        path=certificate.certificate_file,

        media_type="application/pdf",

        filename=(
            f"{certificate.certificate_number}.pdf"
        )
    )


# =========================================================
# GET CERTIFICATE DETAILS
# IMPORTANT:
# KEEP THIS LAST
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
        "certificate_id":
            certificate.id,

        "certificate_number":
            certificate.certificate_number,

        "verification_request_id":
            certificate.verification_request_id,

        "certificate_file":
            certificate.certificate_file,

        "qr_code":
            certificate.qr_code,

        "issued_at":
            certificate.issued_at,

        "valid_until":
            certificate.valid_until,

        "status":
            "VALID"
    }