from fastapi import FastAPI
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

from app.routes.instrument import router as instrument_router
from app.auth.routes import router as auth_router
from app.routes.verification import router as verification_router
from app.routes.inspection import router as inspection_router
from app.routes.evidence import router as evidence_router
from app.routes.certificate import router as certificate_router

from app.database import engine, Base

from app.models import (
    User,
    Instrument,
    VerificationRequest,
    Inspection,
    Evidence,
    Certificate,
)


# =========================================================
# CREATE DATABASE TABLES
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="TrueWeight",
    description="Weighing Instrument Verification & Certification Platform",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://10.23.93.59:5173",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# =========================================================
# ROUTERS
# =========================================================

app.include_router(auth_router)

app.include_router(instrument_router)

app.include_router(verification_router)

app.include_router(inspection_router)

app.include_router(evidence_router)

app.include_router(certificate_router)


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {
        "message": "TrueWeight API is running",
        "status": "OK"
    }


# =========================================================
# DATABASE TEST
# =========================================================

@app.get("/db-test")
def database_test():

    with engine.connect() as connection:

        result = connection.execute(
            text("SELECT 1")
        )

        return {
            "database": "connected",
            "result": result.scalar()
        }