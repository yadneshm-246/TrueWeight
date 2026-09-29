import os
import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)

import qrcode

from app.database import get_db
from app.auth.security import get_current_user

from app.models.user import User
from app.models.instrument import Instrument
from app.models.verification_request import VerificationRequest
from app.models.inspection import Inspection
from app.models.certificate import Certificate

# Blockchain service
from blockchain.service import anchor_certificate


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/certificate",
    tags=["Certificate"],
)


# =========================================================
# DIRECTORIES
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
CERTIFICATE_DIR = os.path.join(UPLOAD_DIR, "certificates")
QR_DIR = os.path.join(UPLOAD_DIR, "qr")

os.makedirs(CERTIFICATE_DIR, exist_ok=True)
os.makedirs(QR_DIR, exist_ok=True)


# =========================================================
# PUBLIC VERIFICATION URL
# =========================================================

PUBLIC_VERIFY_URL = os.getenv(
    "PUBLIC_VERIFY_URL",
    "http://192.168.29.48:5173/verify"
)


# =========================================================
# HELPERS
# =========================================================

def make_certificate_number():
    import secrets

    return f"TW-CERT-{secrets.token_hex(4).upper()}"


def get_value(obj, name, default=None):
    return getattr(obj, name, default)


def make_certificate_hash(
    certificate_number,
    verification_request,
    inspection,
    instrument,
):
    """
    Creates a deterministic SHA-256 hash from
    important certificate information.
    """

    raw_data = "|".join(
        [
            str(certificate_number),
            str(verification_request.id),
            str(verification_request.application_id),
            str(instrument.id),
            str(instrument.unique_id),
            str(instrument.serial_number),
            str(inspection.id),
            str(inspection.standard_weight),
            str(inspection.machine_reading),
            str(inspection.calculated_error),
            str(inspection.permissible_error),
            str(inspection.result),
        ]
    )

    return hashlib.sha256(
        raw_data.encode("utf-8")
    ).hexdigest()


def save_qr_code(
    certificate_number,
):
    """
    Generates QR code pointing to public
    certificate verification page.
    """

    verify_url = (
        f"{PUBLIC_VERIFY_URL.rstrip('/')}/"
        f"{certificate_number}"
    )

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=8,
        border=4,
    )

    qr.add_data(verify_url)
    qr.make(fit=True)

    image = qr.make_image()

    qr_path = os.path.join(
        QR_DIR,
        f"{certificate_number}.png"
    )

    image.save(qr_path)

    return qr_path, verify_url


# =========================================================
# GENERATE PDF
# =========================================================

def generate_certificate_pdf(
    certificate,
    verification_request,
    inspection,
    instrument,
    merchant,
    inspector,
    qr_path,
    verify_url,
):

    certificate_number = certificate.certificate_number

    pdf_path = os.path.join(
        CERTIFICATE_DIR,
        f"{certificate_number}.pdf"
    )

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "CertificateTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        alignment=TA_CENTER,
        spaceAfter=6,
    )

    subtitle_style = ParagraphStyle(
        "CertificateSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        alignment=TA_CENTER,
        spaceAfter=16,
    )

    section_style = ParagraphStyle(
        "Section",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        spaceBefore=7,
        spaceAfter=5,
    )

    normal_style = ParagraphStyle(
        "NormalCertificate",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
    )

    small_style = ParagraphStyle(
        "SmallCertificate",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7,
        leading=9,
    )

    result_style = ParagraphStyle(
        "Result",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#087443"),
    )

    story = []

    # =====================================================
    # HEADER
    # =====================================================

    story.append(
        Paragraph(
            "TRUEWEIGHT",
            title_style,
        )
    )

    story.append(
        Paragraph(
            "VERIFICATION CERTIFICATE",
            subtitle_style,
        )
    )

    story.append(
        HRFlowable(
            width="100%",
            thickness=1,
            color=colors.HexColor("#1f2937"),
            spaceBefore=2,
            spaceAfter=10,
        )
    )

    # =====================================================
    # CERTIFICATE NUMBER
    # =====================================================

    story.append(
        Paragraph(
            f"<b>Certificate Number:</b> "
            f"{certificate_number}",
            normal_style,
        )
    )

    story.append(Spacer(1, 8))

    # =====================================================
    # CERTIFICATE INFORMATION
    # =====================================================

    certificate_info = [
        [
            Paragraph(
                "<b>Verification Request ID</b>",
                normal_style,
            ),
            Paragraph(
                str(verification_request.id),
                normal_style,
            ),
        ],
        [
            Paragraph(
                "<b>Application ID</b>",
                normal_style,
            ),
            Paragraph(
                str(
                    get_value(
                        verification_request,
                        "application_id",
                        "-"
                    )
                ),
                normal_style,
            ),
        ],
        [
            Paragraph(
                "<b>Inspection ID</b>",
                normal_style,
            ),
            Paragraph(
                str(inspection.id),
                normal_style,
            ),
        ],
        [
            Paragraph(
                "<b>Instrument ID</b>",
                normal_style,
            ),
            Paragraph(
                str(instrument.id),
                normal_style,
            ),
        ],
    ]

    table = Table(
        certificate_info,
        colWidths=[55 * mm, 115 * mm],
    )

    table.setStyle(
        TableStyle(
            [
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.4,
                    colors.HexColor("#d1d5db"),
                ),
                (
                    "BACKGROUND",
                    (0, 0),
                    (0, -1),
                    colors.HexColor("#f3f4f6"),
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE",
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
            ]
        )
    )

    story.append(table)

    # =====================================================
    # INSTRUMENT DETAILS
    # =====================================================

    story.append(
        Paragraph(
            "INSTRUMENT DETAILS",
            section_style,
        )
    )

    instrument_info = [
        [
            Paragraph(
                "<b>Instrument Type</b>",
                normal_style,
            ),
            Paragraph(
                str(
                    get_value(
                        instrument,
                        "instrument_type",
                        "-"
                    )
                ),
                normal_style,
            ),
        ],
        [
            Paragraph(
                "<b>Manufacturer</b>",
                normal_style,
            ),
            Paragraph(
                str(
                    get_value(
                        instrument,
                        "manufacturer",
                        "-"
                    )
                ),
                normal_style,
            ),
        ],
        [
            Paragraph(
                "<b>Model</b>",
                normal_style,
            ),
            Paragraph(
                str(
                    get_value(
                        instrument,
                        "model",
                        "-"
                    )
                ),
                normal_style,
            ),
        ],
        [
            Paragraph(
                "<b>Serial Number</b>",
                normal_style,
            ),
            Paragraph(
                str(
                    get_value(
                        instrument,
                        "serial_number",
                        "-"
                    )
                ),
                normal_style,
            ),
        ],
        [
            Paragraph(
                "<b>Capacity</b>",
                normal_style,
            ),
            Paragraph(
                str(
                    get_value(
                        instrument,
                        "capacity",
                        "-"
                    )
                ),
                normal_style,
            ),
        ],
        [
            Paragraph(
                "<b>Location</b>",
                normal_style,
            ),
            Paragraph(
                str(
                    get_value(
                        instrument,
                        "location",
                        "-"
                    )
                ),
                normal_style,
            ),
        ],
    ]

    table = Table(
        instrument_info,
        colWidths=[55 * mm, 115 * mm],
    )

    table.setStyle(
        TableStyle(
            [
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.4,
                    colors.HexColor("#d1d5db"),
                ),
                (
                    "BACKGROUND",
                    (0, 0),
                    (0, -1),
                    colors.HexColor("#f3f4f6"),
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE",
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
            ]
        )
    )

    story.append(table)

    # =====================================================
    # INSPECTION DETAILS
    # =====================================================

    story.append(
        Paragraph(
            "INSPECTION RESULTS",
            section_style,
        )
    )

    inspection_info = [
        [
            Paragraph(
                "<b>Standard Weight</b>",
                normal_style,
            ),
            Paragraph(
                f"{inspection.standard_weight:.3f} kg",
                normal_style,
            ),
        ],
        [
            Paragraph(
                "<b>Machine Reading</b>",
                normal_style,
            ),
            Paragraph(
                f"{inspection.machine_reading:.3f} kg",
                normal_style,
            ),
        ],
        [
            Paragraph(
                "<b>Calculated Error</b>",
                normal_style,
            ),
            Paragraph(
                f"{inspection.calculated_error:.3f} kg",
                normal_style,
            ),
        ],
        [
            Paragraph(
                "<b>Permissible Error</b>",
                normal_style,
            ),
            Paragraph(
                f"{inspection.permissible_error:.3f} kg",
                normal_style,
            ),
        ],
        [
            Paragraph(
                "<b>Result</b>",
                normal_style,
            ),
            Paragraph(
                f"<b>{inspection.result}</b>",
                normal_style,
            ),
        ],
        [
            Paragraph(
                "<b>Remarks</b>",
                normal_style,
            ),
            Paragraph(
                str(
                    inspection.remarks
                    if inspection.remarks
                    else "No remarks"
                ),
                normal_style,
            ),
        ],
    ]

    table = Table(
        inspection_info,
        colWidths=[55 * mm, 115 * mm],
    )

    result_background = (
        colors.HexColor("#dcfce7")
        if inspection.result == "PASS"
        else colors.HexColor("#fee2e2")
    )

    table.setStyle(
        TableStyle(
            [
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.4,
                    colors.HexColor("#d1d5db"),
                ),
                (
                    "BACKGROUND",
                    (0, 0),
                    (0, -1),
                    colors.HexColor("#f3f4f6"),
                ),
                (
                    "BACKGROUND",
                    (1, 4),
                    (1, 4),
                    result_background,
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE",
                ),
                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
            ]
        )
    )

    story.append(table)

    # =====================================================
    # INSPECTOR
    # =====================================================

    story.append(
        Paragraph(
            "INSPECTOR",
            section_style,
        )
    )

    inspector_name = (
        get_value(inspector, "name", "-")
        if inspector
        else "-"
    )

    inspector_email = (
        get_value(inspector, "email", "-")
        if inspector
        else "-"
    )

    story.append(
        Paragraph(
            f"<b>Name:</b> {inspector_name}<br/>"
            f"<b>Email:</b> {inspector_email}",
            normal_style,
        )
    )

    # =====================================================
    # GPS
    # =====================================================

    latitude = get_value(
        inspection,
        "latitude"
    )

    longitude = get_value(
        inspection,
        "longitude"
    )

    accuracy = get_value(
        inspection,
        "location_accuracy"
    )

    if latitude is not None and longitude is not None:

        story.append(
            Paragraph(
                "INSPECTION LOCATION",
                section_style,
            )
        )

        gps_text = (
            f"<b>Latitude:</b> {latitude}<br/>"
            f"<b>Longitude:</b> {longitude}"
        )

        if accuracy is not None:
            gps_text += (
                f"<br/><b>GPS Accuracy:</b> "
                f"{accuracy:.2f} m"
            )

        story.append(
            Paragraph(
                gps_text,
                normal_style,
            )
        )

    # =====================================================
    # RESULT
    # =====================================================

    story.append(Spacer(1, 12))

    story.append(
        Paragraph(
            f"VERIFICATION RESULT: {inspection.result}",
            result_style,
        )
    )

    # =====================================================
    # BLOCKCHAIN
    # =====================================================

    blockchain_status = get_value(
        certificate,
        "blockchain_status",
        "NOT_CONFIGURED",
    )

    blockchain_hash = get_value(
        certificate,
        "certificate_hash",
        None,
    )

    blockchain_tx = get_value(
        certificate,
        "blockchain_tx_hash",
        None,
    )

    story.append(
        Paragraph(
            "BLOCKCHAIN VERIFICATION",
            section_style,
        )
    )

    blockchain_text = (
        f"<b>Status:</b> {blockchain_status}"
    )

    if blockchain_hash:
        blockchain_text += (
            f"<br/><b>Certificate Hash:</b> "
            f"{blockchain_hash}"
        )

    if blockchain_tx:
        blockchain_text += (
            f"<br/><b>Transaction:</b> "
            f"{blockchain_tx}"
        )

    story.append(
        Paragraph(
            blockchain_text,
            small_style,
        )
    )

    # =====================================================
    # QR CODE
    # =====================================================

    if os.path.exists(qr_path):

        story.append(Spacer(1, 10))

        story.append(
            Paragraph(
                "<b>SCAN TO VERIFY</b>",
                small_style,
            )
        )

        from reportlab.platypus import Image

        qr_image = Image(
            qr_path,
            width=32 * mm,
            height=32 * mm,
        )

        qr_info_table = Table(
            [
                [
                    "",
                    qr_image,
                ]
            ],
            colWidths=[105 * mm, 60 * mm],
        )

        qr_info_table.setStyle(
            TableStyle(
                [
                    (
                        "ALIGN",
                        (1, 0),
                        (1, 0),
                        "CENTER",
                    ),
                    (
                        "VALIGN",
                        (0, 0),
                        (-1, -1),
                        "MIDDLE",
                    ),
                ]
            )
        )

        story.append(qr_info_table)

        story.append(
            Paragraph(
                verify_url,
                small_style,
            )
        )

    # =====================================================
    # FOOTER
    # =====================================================

    story.append(Spacer(1, 12))

    story.append(
        HRFlowable(
            width="100%",
            thickness=0.6,
            color=colors.HexColor("#9ca3af"),
        )
    )

    issued_at = get_value(
        certificate,
        "issued_at",
        datetime.now(timezone.utc),
    )

    if issued_at:
        issued_text = str(issued_at)
    else:
        issued_text = "-"

    story.append(
        Spacer(1, 5)
    )

    story.append(
        Paragraph(
            f"Certificate issued: {issued_text}",
            small_style,
        )
    )

    story.append(
        Paragraph(
            "Generated by TrueWeight Verification Platform",
            small_style,
        )
    )

    # =====================================================
    # BUILD
    # =====================================================

    doc.build(story)

    return pdf_path


# =========================================================
# CREATE CERTIFICATE
# =========================================================

@router.post("/")
def generate_certificate(
    verification_request_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):

    # =====================================================
    # AUTHORIZATION
    # =====================================================

    if current_user["role"] not in [
        "INSPECTOR",
        "OFFICER",
    ]:
        raise HTTPException(
            status_code=403,
            detail="Only inspectors or officers can generate certificates",
        )

    # =====================================================
    # REQUEST
    # =====================================================

    verification_request = (
        db.query(VerificationRequest)
        .filter(
            VerificationRequest.id
            == verification_request_id
        )
        .first()
    )

    if not verification_request:
        raise HTTPException(
            status_code=404,
            detail="Verification request not found",
        )

    # =====================================================
    # INSTRUMENT
    # =====================================================

    instrument = (
        db.query(Instrument)
        .filter(
            Instrument.id
            == verification_request.instrument_id
        )
        .first()
    )

    if not instrument:
        raise HTTPException(
            status_code=404,
            detail="Instrument not found",
        )

    # =====================================================
    # INSPECTION
    # =====================================================

    inspection = (
        db.query(Inspection)
        .filter(
            Inspection.verification_request_id
            == verification_request_id
        )
        .order_by(
            Inspection.inspected_at.desc()
        )
        .first()
    )

    if not inspection:
        raise HTTPException(
            status_code=404,
            detail="Inspection not found",
        )

    # =====================================================
    # ONLY PASS CAN GET CERTIFICATE
    # =====================================================

    if inspection.result != "PASS":
        raise HTTPException(
            status_code=400,
            detail=(
                "Certificate can only be generated "
                "for a PASS inspection"
            ),
        )

    # =====================================================
    # CHECK EXISTING CERTIFICATE
    # =====================================================

    existing_certificate = (
        db.query(Certificate)
        .filter(
            Certificate.verification_request_id
            == verification_request_id
        )
        .first()
    )

    if existing_certificate:

        return {
            "message": "Certificate already exists",
            "certificate_id": existing_certificate.id,
            "certificate_number": (
                existing_certificate.certificate_number
            ),
            "pdf_url": (
                f"/certificate/"
                f"{existing_certificate.certificate_number}"
                f"/pdf"
            ),
            "blockchain_status": get_value(
                existing_certificate,
                "blockchain_status",
                "UNKNOWN",
            ),
        }

    # =====================================================
    # MERCHANT
    # =====================================================

    merchant = None

    owner_id = get_value(
        instrument,
        "owner_id",
        None,
    )

    if owner_id:

        merchant = (
            db.query(User)
            .filter(
                User.id == owner_id
            )
            .first()
        )

    # =====================================================
    # INSPECTOR
    # =====================================================

    inspector = (
        db.query(User)
        .filter(
            User.id == inspection.inspector_id
        )
        .first()
    )

    # =====================================================
    # CERTIFICATE NUMBER
    # =====================================================

    certificate_number = make_certificate_number()

    # =====================================================
    # ISSUE DATE
    # =====================================================

    issued_at = datetime.now(timezone.utc)

    valid_until = issued_at + timedelta(
        days=365
    )

    # =====================================================
    # CERTIFICATE HASH
    # =====================================================

    certificate_hash = make_certificate_hash(
        certificate_number,
        verification_request,
        inspection,
        instrument,
    )

    # =====================================================
    # CREATE CERTIFICATE OBJECT
    # =====================================================

    certificate_kwargs = {
        "verification_request_id":
            verification_request_id,

        "certificate_number":
            certificate_number,

        "issued_at":
            issued_at,

        "valid_until":
            valid_until,
    }

    # Optional model fields

    if hasattr(
        Certificate,
        "certificate_hash",
    ):
        certificate_kwargs[
            "certificate_hash"
        ] = certificate_hash

    if hasattr(
        Certificate,
        "blockchain_status",
    ):
        certificate_kwargs[
            "blockchain_status"
        ] = "PENDING"

    certificate = Certificate(
        **certificate_kwargs
    )

    db.add(certificate)
    db.commit()
    db.refresh(certificate)

    # =====================================================
    # BLOCKCHAIN
    # =====================================================

    blockchain_status = "NOT_CONFIGURED"
    blockchain_tx_hash = None
    blockchain_error = None

    try:

        blockchain_result = anchor_certificate(
            certificate_hash
        )

        if isinstance(
            blockchain_result,
            dict,
        ):

            blockchain_status = (
                blockchain_result.get(
                    "status",
                    "ANCHORED",
                )
            )

            blockchain_tx_hash = (
                blockchain_result.get(
                    "tx_hash"
                )
                or blockchain_result.get(
                    "transaction_hash"
                )
            )

        elif blockchain_result:

            blockchain_status = "ANCHORED"

            blockchain_tx_hash = str(
                blockchain_result
            )

        else:

            blockchain_status = "NOT_CONFIGURED"

    except Exception as blockchain_exception:

        blockchain_error = str(
            blockchain_exception
        )

        blockchain_status = "ERROR"

    # =====================================================
    # UPDATE BLOCKCHAIN DATA
    # =====================================================

    if hasattr(
        certificate,
        "blockchain_status",
    ):

        certificate.blockchain_status = (
            blockchain_status
        )

    if hasattr(
        certificate,
        "blockchain_tx_hash",
    ):

        certificate.blockchain_tx_hash = (
            blockchain_tx_hash
        )

    if hasattr(
        certificate,
        "blockchain_network",
    ):

        certificate.blockchain_network = (
            os.getenv(
                "BLOCKCHAIN_NETWORK",
                "Polygon Amoy",
            )
        )

    if hasattr(
        certificate,
        "blockchain_contract",
    ):

        certificate.blockchain_contract = (
            os.getenv(
                "BLOCKCHAIN_CONTRACT_ADDRESS",
                None,
            )
        )

    if hasattr(
        certificate,
        "blockchain_error",
    ):

        certificate.blockchain_error = (
            blockchain_error
        )

    if (
        blockchain_status == "ANCHORED"
        and hasattr(
            certificate,
            "anchored_at",
        )
    ):

        certificate.anchored_at = (
            datetime.now(timezone.utc)
        )

    db.commit()
    db.refresh(certificate)

    # =====================================================
    # QR CODE
    # =====================================================

    qr_path, verify_url = save_qr_code(
        certificate_number
    )

    # =====================================================
    # PDF
    # =====================================================

    pdf_path = generate_certificate_pdf(
        certificate=certificate,
        verification_request=verification_request,
        inspection=inspection,
        instrument=instrument,
        merchant=merchant,
        inspector=inspector,
        qr_path=qr_path,
        verify_url=verify_url,
    )

    # =====================================================
    # SAVE PDF PATH
    # =====================================================

    if hasattr(
        certificate,
        "pdf_path",
    ):

        certificate.pdf_path = pdf_path

    if hasattr(
        certificate,
        "qr_path",
    ):

        certificate.qr_path = qr_path

    db.commit()
    db.refresh(certificate)

    # =====================================================
    # RESPONSE
    # =====================================================

    return {
        "message": "Certificate generated successfully",
        "certificate_id": certificate.id,
        "certificate_number": certificate.certificate_number,
        "verification_request_id": verification_request_id,
        "inspection_id": inspection.id,
        "result": inspection.result,
        "certificate_hash": certificate_hash,
        "blockchain_status": blockchain_status,
        "blockchain_tx_hash": blockchain_tx_hash,
        "verification_url": verify_url,
        "pdf_url": (
            f"/certificate/"
            f"{certificate_number}/pdf"
        ),
    }


# =========================================================
# DOWNLOAD CERTIFICATE PDF
# =========================================================

@router.get(
    "/{certificate_number}/pdf"
)
def download_certificate(
    certificate_number: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
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
            detail="Certificate not found",
        )

    pdf_path = os.path.join(
        CERTIFICATE_DIR,
        f"{certificate_number}.pdf"
    )

    if not os.path.exists(pdf_path):
        raise HTTPException(
            status_code=404,
            detail="Certificate PDF not found",
        )

    # =====================================================
    # CERTIFICATE ACCESS CONTROL
    # =====================================================

    role = current_user["role"]

    # Officer can view/download all certificates
    if role == "OFFICER":
        pass

    # Inspector can view/download certificates
    elif role == "INSPECTOR":
        pass

    # Shopkeeper can only view their own certificate
    elif role == "SHOPKEEPER":

        verification_request = (
            db.query(VerificationRequest)
            .filter(
                VerificationRequest.id
                == certificate.verification_request_id
            )
            .first()
        )

        if not verification_request:
            raise HTTPException(
                status_code=404,
                detail="Verification request not found",
            )

        instrument = (
            db.query(Instrument)
            .filter(
                Instrument.id
                == verification_request.instrument_id
            )
            .first()
        )

        if not instrument:
            raise HTTPException(
                status_code=404,
                detail="Instrument not found",
            )

        if (
            instrument.owner_id
            != current_user["user_id"]
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have access to this certificate",
            )

    else:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view certificates",
        )

    # =====================================================
    # RETURN PDF
    # =====================================================

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"{certificate_number}.pdf",
    )


# =========================================================
# PUBLIC CERTIFICATE VERIFICATION
# =========================================================

@router.get(
    "/verify/{certificate_number}"
)
def verify_certificate(
    certificate_number: str,
    db: Session = Depends(get_db),
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
            detail="Certificate not found",
        )

    verification_request = (
        db.query(VerificationRequest)
        .filter(
            VerificationRequest.id
            == certificate.verification_request_id
        )
        .first()
    )

    inspection = None

    if verification_request:

        inspection = (
            db.query(Inspection)
            .filter(
                Inspection.verification_request_id
                == verification_request.id
            )
            .order_by(
                Inspection.inspected_at.desc()
            )
            .first()
        )

    return {
        "verified": True,

        "status": (
            verification_request.status
            if verification_request
            else "VERIFIED"
        ),

        "certificate_id":
            certificate.id,

        "certificate_number":
            certificate.certificate_number,

        "verification_request_id":
            certificate.verification_request_id,

        "issued_at": (
            certificate.issued_at.isoformat()
            if certificate.issued_at
            else None
        ),

        "valid_until": (
            certificate.valid_until.isoformat()
            if certificate.valid_until
            else None
        ),

        "result": (
            inspection.result
            if inspection
            else "PASS"
        ),

        "certificate_hash": get_value(
            certificate,
            "certificate_hash",
            None,
        ),

        "blockchain_status": get_value(
            certificate,
            "blockchain_status",
            "NOT_CONFIGURED",
        ),

        "blockchain_tx_hash": get_value(
            certificate,
            "blockchain_tx_hash",
            None,
        ),
    }