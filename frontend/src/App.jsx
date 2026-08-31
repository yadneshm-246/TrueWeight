import { useEffect, useState } from "react";
import "./index.css";

const BACKEND_URL = "http://192.168.29.127:8000";

function App() {
  const [page, setPage] = useState("role-select");

  const [selectedRole, setSelectedRole] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [token, setToken] = useState(
    localStorage.getItem("trueweight_token") || ""
  );

  const [user, setUser] = useState(null);

  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  // =========================
  // INSTRUMENTS
  // =========================

  const [instruments, setInstruments] = useState([]);
  const [instrumentsLoading, setInstrumentsLoading] = useState(false);
  const [instrumentsError, setInstrumentsError] = useState("");

  const [showInstrumentForm, setShowInstrumentForm] = useState(false);

  const [instrumentForm, setInstrumentForm] = useState({
    unique_id: "",
    instrument_type: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    capacity: "",
    location: "",
    purchase_date: "",
  });

  // =========================
  // VERIFICATION REQUESTS
  // =========================

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState("");

  // =========================
  // INSPECTION
  // =========================

  const [selectedRequest, setSelectedRequest] = useState(null);

  const [standardWeight, setStandardWeight] = useState("");
  const [machineReading, setMachineReading] = useState("");
  const [permissibleError, setPermissibleError] = useState("");
  const [remarks, setRemarks] = useState("");

  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [inspectionError, setInspectionError] = useState("");
  const [inspectionResult, setInspectionResult] = useState(null);

  // =========================
  // CERTIFICATES
  // =========================

  const [certificateLoading, setCertificateLoading] = useState(false);
  const [certificateError, setCertificateError] = useState("");
  const [certificateResult, setCertificateResult] = useState(null);

  const [merchantCertificates, setMerchantCertificates] = useState([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [certificatesError, setCertificatesError] = useState("");

  // =========================
  // PUBLIC CERTIFICATE
  // =========================

  const [verifyCertificateNumber, setVerifyCertificateNumber] =
    useState("");
  const [verifiedCertificate, setVerifiedCertificate] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // =========================
  // CHECK EXISTING LOGIN
  // =========================

  useEffect(() => {
    if (token) {
      getCurrentUser(token);
    }
  }, []);

  // =========================
  // GET CURRENT USER
  // =========================

  const getCurrentUser = async (accessToken) => {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Session expired");
      }

      const data = await response.json();

      setUser(data);

      if (data.role === "INSPECTOR") {
        setSelectedRole("INSPECTOR");
        setPage("inspector-dashboard");
      } else if (data.role === "SHOPKEEPER") {
        setSelectedRole("SHOPKEEPER");
        setPage("merchant-dashboard");
      } else {
        logout();
      }
    } catch (error) {
      console.error("Current user error:", error);

      localStorage.removeItem("trueweight_token");

      setToken("");
      setUser(null);
      setPage("role-select");
    }
  };

  // =========================
  // ROLE SELECTION
  // =========================

  const selectRole = (role) => {
    setSelectedRole(role);
    setEmail("");
    setPassword("");
    setLoginError("");
    setPage("login");
  };

  // =========================
  // LOGIN
  // =========================

  const login = async () => {
    if (!email.trim() || !password.trim()) {
      setLoginError("Please enter email and password.");
      return;
    }

    setLoading(true);
    setLoginError("");

    try {
      const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Invalid email or password");
      }

      localStorage.setItem(
        "trueweight_token",
        data.access_token
      );

      setToken(data.access_token);

      await getCurrentUser(data.access_token);
    } catch (error) {
      console.error("Login error:", error);

      setLoginError(error.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOGOUT
  // =========================

  const logout = () => {
    localStorage.removeItem("trueweight_token");

    setToken("");
    setUser(null);

    setEmail("");
    setPassword("");

    setRequests([]);
    setInstruments([]);
    setMerchantCertificates([]);

    closeInspection();

    setCertificateResult(null);

    setSelectedRole("");

    setPage("role-select");
  };

  // =====================================================
  // LOAD MERCHANT INSTRUMENTS
  // =====================================================

  const loadInstruments = async () => {
    if (!token) return;

    setInstrumentsLoading(true);
    setInstrumentsError("");

    try {
      const response = await fetch(`${BACKEND_URL}/instruments/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to load instruments"
        );
      }

      setInstruments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Instrument error:", error);

      setInstrumentsError(
        error.message || "Failed to load instruments"
      );
    } finally {
      setInstrumentsLoading(false);
    }
  };

  // =====================================================
  // CREATE INSTRUMENT
  // =====================================================

  const createInstrument = async () => {
    const requiredFields = [
      "unique_id",
      "instrument_type",
      "manufacturer",
      "model",
      "serial_number",
      "capacity",
      "location",
    ];

    for (const field of requiredFields) {
      if (!instrumentForm[field].trim()) {
        setInstrumentsError(
          `Please enter ${field.replaceAll("_", " ")}.`
        );
        return;
      }
    }

    setInstrumentsLoading(true);
    setInstrumentsError("");

    try {
      const params = new URLSearchParams();

      Object.entries(instrumentForm).forEach(([key, value]) => {
        if (value.trim()) {
          params.append(key, value.trim());
        }
      });

      const response = await fetch(
        `${BACKEND_URL}/instruments/?${params.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to create instrument"
        );
      }

      setInstrumentForm({
        unique_id: "",
        instrument_type: "",
        manufacturer: "",
        model: "",
        serial_number: "",
        capacity: "",
        location: "",
        purchase_date: "",
      });

      setShowInstrumentForm(false);

      await loadInstruments();
    } catch (error) {
      console.error("Create instrument error:", error);

      setInstrumentsError(
        error.message || "Failed to create instrument"
      );
    } finally {
      setInstrumentsLoading(false);
    }
  };

  // =====================================================
  // CREATE VERIFICATION REQUEST
  // =====================================================

  const requestVerification = async (instrumentId) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/verification/request?instrument_id=${instrumentId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to create verification request"
        );
      }

      alert(
        `Verification request created!\nApplication ID: ${data.application_id}`
      );

      await loadInstruments();
    } catch (error) {
      console.error("Verification request error:", error);

      alert(
        error.message || "Failed to create verification request"
      );
    }
  };

  // =====================================================
  // LOAD MY VERIFICATION REQUESTS
  // =====================================================

  const loadMyRequests = async () => {
    if (!token) return;

    setRequestsLoading(true);
    setRequestsError("");

    try {
      const response = await fetch(
        `${BACKEND_URL}/verification/my`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to load requests"
        );
      }

      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("My requests error:", error);

      setRequestsError(
        error.message || "Failed to load requests"
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  // =====================================================
  // LOAD INSPECTOR REQUESTS
  // =====================================================

  const loadRequests = async () => {
    if (!token) {
      setRequestsError("Please login first.");
      return;
    }

    setRequestsLoading(true);
    setRequestsError("");

    try {
      const response = await fetch(
        `${BACKEND_URL}/verification/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to load verification requests"
        );
      }

      setRequests(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Verification requests error:",
        error
      );

      setRequestsError(
        error.message ||
          "Failed to load verification requests"
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  // =====================================================
  // LOAD REQUESTS WHEN DASHBOARD OPENS
  // =====================================================

  useEffect(() => {
    if (
      page === "inspector-dashboard" &&
      token &&
      user?.role === "INSPECTOR"
    ) {
      loadRequests();
    }

    if (
      page === "merchant-dashboard" &&
      token &&
      user?.role === "SHOPKEEPER"
    ) {
      loadInstruments();
      loadMyRequests();
      loadMerchantCertificates();
    }
  }, [page, token, user]);

  // =====================================================
  // OPEN INSPECTION
  // =====================================================

  const openInspection = (request) => {
    setSelectedRequest(request);

    setStandardWeight("");
    setMachineReading("");
    setPermissibleError("");
    setRemarks("");

    setInspectionError("");
    setInspectionResult(null);

    setCertificateResult(null);
    setCertificateError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // CLOSE INSPECTION
  // =====================================================

  const closeInspection = () => {
    setSelectedRequest(null);

    setStandardWeight("");
    setMachineReading("");
    setPermissibleError("");
    setRemarks("");

    setInspectionError("");
    setInspectionResult(null);

    setCertificateResult(null);
    setCertificateError("");
  };

  // =====================================================
  // SUBMIT INSPECTION
  // =====================================================

  const submitInspection = async () => {
    if (!selectedRequest) {
      return;
    }

    if (
      standardWeight === "" ||
      machineReading === "" ||
      permissibleError === ""
    ) {
      setInspectionError(
        "Please fill all required inspection fields."
      );
      return;
    }

    const standard = Number(standardWeight);
    const reading = Number(machineReading);
    const permissible = Number(permissibleError);

    if (
      Number.isNaN(standard) ||
      Number.isNaN(reading) ||
      Number.isNaN(permissible)
    ) {
      setInspectionError(
        "Weight and error values must be valid numbers."
      );
      return;
    }

    if (standard < 0 || reading < 0) {
      setInspectionError(
        "Weight values cannot be negative."
      );
      return;
    }

    if (permissible < 0) {
      setInspectionError(
        "Permissible error cannot be negative."
      );
      return;
    }

    setInspectionLoading(true);
    setInspectionError("");
    setInspectionResult(null);
    setCertificateResult(null);

    try {
      const params = new URLSearchParams();

      params.append(
        "verification_request_id",
        selectedRequest.request_id
      );

      params.append(
        "standard_weight",
        standard
      );

      params.append(
        "machine_reading",
        reading
      );

      params.append(
        "permissible_error",
        permissible
      );

      if (remarks.trim()) {
        params.append(
          "remarks",
          remarks.trim()
        );
      }

      const response = await fetch(
        `${BACKEND_URL}/inspection/?${params.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to complete inspection"
        );
      }

      setInspectionResult(data);

      await loadRequests();
    } catch (error) {
      console.error(
        "Inspection error:",
        error
      );

      setInspectionError(
        error.message ||
          "Failed to complete inspection"
      );
    } finally {
      setInspectionLoading(false);
    }
  };

  // =====================================================
  // GENERATE CERTIFICATE
  // =====================================================

  const generateCertificate = async () => {
    if (!selectedRequest) {
      return;
    }

    if (
      !inspectionResult ||
      inspectionResult.result !== "PASS"
    ) {
      setCertificateError(
        "Certificate can only be generated after a PASS inspection."
      );
      return;
    }

    setCertificateLoading(true);
    setCertificateError("");
    setCertificateResult(null);

    try {
      const response = await fetch(
        `${BACKEND_URL}/certificate/?verification_request_id=${selectedRequest.request_id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to generate certificate"
        );
      }

      setCertificateResult(data);

      await loadRequests();
    } catch (error) {
      console.error(
        "Certificate generation error:",
        error
      );

      setCertificateError(
        error.message ||
          "Failed to generate certificate"
      );
    } finally {
      setCertificateLoading(false);
    }
  };

  // =====================================================
  // DOWNLOAD CERTIFICATE
  // =====================================================

  const downloadCertificate = (certificateNumber) => {
    const url =
      `${BACKEND_URL}/certificate/` +
      `${certificateNumber}/pdf`;

    window.open(url, "_blank");
  };

  // =====================================================
  // LOAD MERCHANT CERTIFICATES
  // =====================================================

  const loadMerchantCertificates = async () => {
    if (!token) return;

    setCertificatesLoading(true);
    setCertificatesError("");

    try {
      const response = await fetch(
        `${BACKEND_URL}/certificate/my`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Failed to load certificates"
        );
      }

      setMerchantCertificates(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Certificates error:",
        error
      );

      setCertificatesError(
        error.message ||
          "Failed to load certificates"
      );
    } finally {
      setCertificatesLoading(false);
    }
  };

  // =====================================================
  // VERIFY PUBLIC CERTIFICATE
  // =====================================================

  const verifyCertificate = async () => {
    if (!verifyCertificateNumber.trim()) {
      setVerifyError(
        "Please enter a certificate number."
      );
      return;
    }

    setVerifyLoading(true);
    setVerifyError("");
    setVerifiedCertificate(null);

    try {
      const certificateNumber =
        verifyCertificateNumber.trim();

      const response = await fetch(
        `${BACKEND_URL}/certificate/verify/${encodeURIComponent(
          certificateNumber
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Certificate not found"
        );
      }

      setVerifiedCertificate(data);
    } catch (error) {
      console.error(
        "Certificate verification error:",
        error
      );

      setVerifyError(
        error.message ||
          "Certificate verification failed"
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  // =====================================================
  // PUBLIC VERIFY PAGE
  // =====================================================

  if (window.location.pathname.startsWith("/verify/")) {
    const certificateNumber =
      decodeURIComponent(
        window.location.pathname.split("/verify/")[1] || ""
      );

    if (
      certificateNumber &&
      verifyCertificateNumber !== certificateNumber
    ) {
      setVerifyCertificateNumber(certificateNumber);
    }

    return (
      <div className="app">
        <header className="navbar">
          <div className="logo">
            TRUE<span>WEIGHT</span>
          </div>

          <div className="nav-status">
            Certificate Verification
          </div>
        </header>

        <main className="container">
          <section className="hero">
            <div className="badge">
              🔐 CERTIFICATE VERIFICATION
            </div>

            <h1>
              Verify TrueWeight Certificate
            </h1>

            <p>
              Check whether a TrueWeight verification
              certificate is valid.
            </p>
          </section>

          <section className="verify-card">
            <h2>
              Certificate Verification
            </h2>

            <p className="card-description">
              Enter the certificate number printed
              on the certificate.
            </p>

            <div className="form-group">
              <label>
                Certificate Number
              </label>

              <input
                type="text"
                placeholder="Example: TW-CERT-XXXXXXXX"
                value={verifyCertificateNumber}
                onChange={(e) =>
                  setVerifyCertificateNumber(
                    e.target.value.toUpperCase()
                  )
                }
              />
            </div>

            {verifyError && (
              <div className="error-box">
                ❌ {verifyError}
              </div>
            )}

            <button
              className="login-button"
              onClick={verifyCertificate}
              disabled={verifyLoading}
            >
              {verifyLoading
                ? "Verifying..."
                : "🔍 Verify Certificate"}
            </button>

            {verifiedCertificate && (
              <div className="result-card">
                <div className="verified-icon">
                  ✓
                </div>

                <h2>
                  Certificate is Valid
                </h2>

                <p className="verified-text">
                  This certificate has been successfully
                  verified by TrueWeight.
                </p>

                <div className="details">
                  <div className="detail-row">
                    <span>
                      Certificate Number
                    </span>

                    <strong>
                      {
                        verifiedCertificate.certificate_number
                      }
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Certificate ID
                    </span>

                    <strong>
                      {
                        verifiedCertificate.certificate_id
                      }
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Verification Request
                    </span>

                    <strong>
                      {
                        verifiedCertificate.verification_request_id
                      }
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Status
                    </span>

                    <strong className="valid">
                      {verifiedCertificate.status}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Issued At
                    </span>

                    <strong>
                      {
                        verifiedCertificate.issued_at
                          ? new Date(
                              verifiedCertificate.issued_at
                            ).toLocaleString()
                          : "N/A"
                      }
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Valid Until
                    </span>

                    <strong>
                      {
                        verifiedCertificate.valid_until ||
                        "No expiry specified"
                      }
                    </strong>
                  </div>
                </div>

                <div className="security-message">
                  🛡️ Authentic TrueWeight certificate.
                </div>
              </div>
            )}
          </section>
        </main>

        <footer>
          © 2026 TrueWeight Verification Platform
        </footer>
      </div>
    );
  }

  // =====================================================
  // ROLE SELECT PAGE
  // =====================================================

  if (page === "role-select") {
    return (
      <div className="app">
        <header className="navbar">
          <div className="logo">
            TRUE<span>WEIGHT</span>
          </div>

          <div className="nav-status">
            Verification Platform
          </div>
        </header>

        <main className="container">
          <section className="hero">
            <div className="badge">
              ⚖️ TRUEWEIGHT
            </div>

            <h1>
              Weighing Instrument
              Verification
            </h1>

            <p>
              A secure platform for registering,
              verifying and certifying weighing
              instruments.
            </p>
          </section>

          <section className="role-selection">
            <h2>
              Choose Login
            </h2>

            <p className="card-description">
              Select your account type to continue.
            </p>

            <div className="role-grid">
              <button
                className="role-card"
                onClick={() =>
                  selectRole("SHOPKEEPER")
                }
              >
                <div className="role-icon">
                  🏪
                </div>

                <h3>
                  Merchant Login
                </h3>

                <p>
                  Register your weighing instruments
                  and request verification.
                </p>

                <span>
                  Continue →
                </span>
              </button>

              <button
                className="role-card"
                onClick={() =>
                  selectRole("INSPECTOR")
                }
              >
                <div className="role-icon">
                  👨‍🔧
                </div>

                <h3>
                  Inspector Login
                </h3>

                <p>
                  Review verification requests
                  and perform inspections.
                </p>

                <span>
                  Continue →
                </span>
              </button>
            </div>
          </section>
        </main>

        <footer>
          © 2026 TrueWeight Verification Platform
        </footer>
      </div>
    );
  }

  // =====================================================
  // LOGIN PAGE
  // =====================================================

  if (page === "login") {
    const isInspector =
      selectedRole === "INSPECTOR";

    return (
      <div className="app">
        <header className="navbar">
          <div className="logo">
            TRUE<span>WEIGHT</span>
          </div>

          <div className="nav-status">
            {isInspector
              ? "Inspector Portal"
              : "Merchant Portal"}
          </div>
        </header>

        <main className="container">
          <section className="hero">
            <div className="badge">
              🔐 SECURE LOGIN
            </div>

            <h1>
              {isInspector
                ? "Inspector Login"
                : "Merchant Login"}
            </h1>

            <p>
              Login to the TrueWeight
              Verification Platform.
            </p>
          </section>

          <section className="verify-card">
            <h2>
              {isInspector
                ? "Inspector Login"
                : "Merchant Login"}
            </h2>

            <p className="card-description">
              Enter your registered email
              and password.
            </p>

            <div className="form-group">
              <label>
                Email
              </label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLoginError("");
                }}
              />

              <label>
                Password
              </label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    login();
                  }
                }}
              />
            </div>

            {loginError && (
              <div className="error-box">
                ❌ {loginError}
              </div>
            )}

            <button
              className="login-button"
              onClick={login}
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>

            <button
              className="secondary-button"
              onClick={() =>
                setPage("role-select")
              }
            >
              ← Back to Login Selection
            </button>
          </section>
        </main>

        <footer>
          © 2026 TrueWeight Verification Platform
        </footer>
      </div>
    );
  }

  // =====================================================
  // MERCHANT DASHBOARD
  // =====================================================

  if (page === "merchant-dashboard") {
    return (
      <div className="app">
        <header className="navbar">
          <div className="logo">
            TRUE<span>WEIGHT</span>
          </div>

          <div className="nav-status">
            Merchant Dashboard
          </div>

          <button
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>
        </header>

        <main className="container">
          <section className="hero">
            <div className="badge">
              🏪 MERCHANT
            </div>

            <h1>
              Merchant Dashboard
            </h1>

            <p>
              Manage weighing instruments,
              verification requests and certificates.
            </p>
          </section>

          {/* =========================
              MERCHANT INFORMATION
          ========================= */}

          <section className="verify-card">
            <h2>
              Welcome, {user?.name || "Merchant"}
            </h2>

            <p className="card-description">
              Your merchant account is successfully
              connected to TrueWeight.
            </p>

            <div className="details">
              <div className="detail-row">
                <span>
                  User ID
                </span>

                <strong>
                  {user?.id || "N/A"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  Name
                </span>

                <strong>
                  {user?.name || "N/A"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  Email
                </span>

                <strong>
                  {user?.email || "N/A"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  Role
                </span>

                <strong className="valid">
                  {user?.role || "SHOPKEEPER"}
                </strong>
              </div>
            </div>
          </section>

          {/* =========================
              INSTRUMENTS
          ========================= */}

          <section className="verify-card">
            <div className="inspection-header">
              <div>
                <h2>
                  ⚖️ My Instruments
                </h2>

                <p className="card-description">
                  Register and manage your weighing
                  instruments.
                </p>
              </div>

              <button
                className="login-button"
                onClick={() =>
                  setShowInstrumentForm(
                    !showInstrumentForm
                  )
                }
              >
                {showInstrumentForm
                  ? "✕ Close"
                  : "＋ Add Instrument"}
              </button>
            </div>

            {showInstrumentForm && (
              <div className="form-group">
                <label>
                  Unique ID
                </label>

                <input
                  type="text"
                  placeholder="Example: TW-SCALE-001"
                  value={instrumentForm.unique_id}
                  onChange={(e) =>
                    setInstrumentForm({
                      ...instrumentForm,
                      unique_id: e.target.value,
                    })
                  }
                />

                <label>
                  Instrument Type
                </label>

                <input
                  type="text"
                  placeholder="Example: Digital Weighing Scale"
                  value={instrumentForm.instrument_type}
                  onChange={(e) =>
                    setInstrumentForm({
                      ...instrumentForm,
                      instrument_type:
                        e.target.value,
                    })
                  }
                />

                <label>
                  Manufacturer
                </label>

                <input
                  type="text"
                  placeholder="Manufacturer"
                  value={instrumentForm.manufacturer}
                  onChange={(e) =>
                    setInstrumentForm({
                      ...instrumentForm,
                      manufacturer:
                        e.target.value,
                    })
                  }
                />

                <label>
                  Model
                </label>

                <input
                  type="text"
                  placeholder="Model"
                  value={instrumentForm.model}
                  onChange={(e) =>
                    setInstrumentForm({
                      ...instrumentForm,
                      model: e.target.value,
                    })
                  }
                />

                <label>
                  Serial Number
                </label>

                <input
                  type="text"
                  placeholder="Serial Number"
                  value={instrumentForm.serial_number}
                  onChange={(e) =>
                    setInstrumentForm({
                      ...instrumentForm,
                      serial_number:
                        e.target.value,
                    })
                  }
                />

                <label>
                  Capacity
                </label>

                <input
                  type="text"
                  placeholder="Example: 30 kg"
                  value={instrumentForm.capacity}
                  onChange={(e) =>
                    setInstrumentForm({
                      ...instrumentForm,
                      capacity: e.target.value,
                    })
                  }
                />

                <label>
                  Location
                </label>

                <input
                  type="text"
                  placeholder="Instrument location"
                  value={instrumentForm.location}
                  onChange={(e) =>
                    setInstrumentForm({
                      ...instrumentForm,
                      location: e.target.value,
                    })
                  }
                />

                <label>
                  Purchase Date
                </label>

                <input
                  type="date"
                  value={instrumentForm.purchase_date}
                  onChange={(e) =>
                    setInstrumentForm({
                      ...instrumentForm,
                      purchase_date:
                        e.target.value,
                    })
                  }
                />

                <button
                  className="login-button"
                  onClick={createInstrument}
                  disabled={instrumentsLoading}
                >
                  {instrumentsLoading
                    ? "Registering..."
                    : "⚖️ Register Instrument"}
                </button>
              </div>
            )}

            {instrumentsError && (
              <div className="error-box">
                ❌ {instrumentsError}
              </div>
            )}

            {!instrumentsLoading &&
              !instrumentsError &&
              instruments.length === 0 && (
                <div className="loading-box">
                  ⚖️ No instruments registered yet.
                </div>
              )}

            {instruments.map((instrument) => (
              <div
                className="result-card"
                key={instrument.id}
              >
                <div className="verified-icon">
                  ⚖️
                </div>

                <h2>
                  {instrument.unique_id}
                </h2>

                <p className="verified-text">
                  {instrument.instrument_type}
                </p>

                <div className="details">
                  <div className="detail-row">
                    <span>
                      Instrument ID
                    </span>

                    <strong>
                      {instrument.id}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Manufacturer
                    </span>

                    <strong>
                      {instrument.manufacturer}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Model
                    </span>

                    <strong>
                      {instrument.model}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Serial Number
                    </span>

                    <strong>
                      {instrument.serial_number}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Capacity
                    </span>

                    <strong>
                      {instrument.capacity}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Location
                    </span>

                    <strong>
                      {instrument.location}
                    </strong>
                  </div>
                </div>

                <button
                  className="login-button"
                  onClick={() =>
                    requestVerification(
                      instrument.id
                    )
                  }
                >
                  📋 Request Verification
                </button>
              </div>
            ))}
          </section>

          {/* =========================
              MY REQUESTS
          ========================= */}

          <section className="verify-card">
            <h2>
              📋 My Verification Requests
            </h2>

            <p className="card-description">
              Track the status of your verification
              applications.
            </p>

            <button
              className="login-button"
              onClick={loadMyRequests}
              disabled={requestsLoading}
            >
              {requestsLoading
                ? "Loading..."
                : "🔄 Refresh Requests"}
            </button>

            {requestsError && (
              <div className="error-box">
                ❌ {requestsError}
              </div>
            )}

            {!requestsLoading &&
              !requestsError &&
              requests.length === 0 && (
                <div className="loading-box">
                  📋 No verification requests found.
                </div>
              )}

            {requests.map((request) => (
              <div
                className="result-card"
                key={request.request_id}
              >
                <div className="verified-icon">
                  {request.status === "PENDING"
                    ? "!"
                    : request.status === "VERIFIED"
                    ? "✓"
                    : "✕"}
                </div>

                <h2>
                  {request.application_id}
                </h2>

                <p className="verified-text">
                  Verification Request
                </p>

                <div className="details">
                  <div className="detail-row">
                    <span>
                      Status
                    </span>

                    <strong
                      className={
                        request.status ===
                        "VERIFIED"
                          ? "valid"
                          : ""
                      }
                    >
                      {request.status}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Instrument
                    </span>

                    <strong>
                      {
                        request.instrument
                          ?.instrument_type ||
                        "N/A"
                      }
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Manufacturer
                    </span>

                    <strong>
                      {
                        request.instrument
                          ?.manufacturer ||
                        "N/A"
                      }
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Model
                    </span>

                    <strong>
                      {
                        request.instrument
                          ?.model ||
                        "N/A"
                      }
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Serial Number
                    </span>

                    <strong>
                      {
                        request.instrument
                          ?.serial_number ||
                        "N/A"
                      }
                    </strong>
                  </div>
                </div>

                {request.status === "VERIFIED" && (
                  <div className="security-message">
                    ✅ Instrument successfully verified.
                  </div>
                )}

                {request.status === "REJECTED" && (
                  <div className="error-box">
                    ❌ Instrument was rejected.
                  </div>
                )}
              </div>
            ))}
          </section>

          {/* =========================
              CERTIFICATES
          ========================= */}

          <section className="verify-card">
            <h2>
              📜 My Certificates
            </h2>

            <p className="card-description">
              View and download your valid
              TrueWeight certificates.
            </p>

            <button
              className="login-button"
              onClick={loadMerchantCertificates}
              disabled={certificatesLoading}
            >
              {certificatesLoading
                ? "Loading Certificates..."
                : "🔄 Refresh Certificates"}
            </button>

            {certificatesError && (
              <div className="error-box">
                ❌ {certificatesError}
              </div>
            )}

            {!certificatesLoading &&
              !certificatesError &&
              merchantCertificates.length === 0 && (
                <div className="loading-box">
                  📜 No certificates available yet.
                </div>
              )}

            {merchantCertificates.map((certificate) => (
              <div
                className="result-card"
                key={certificate.certificate_id}
              >
                <div className="verified-icon">
                  ✓
                </div>

                <h2>
                  {certificate.certificate_number}
                </h2>

                <p className="verified-text">
                  TrueWeight Verification Certificate
                </p>

                <div className="details">
                  <div className="detail-row">
                    <span>
                      Certificate ID
                    </span>

                    <strong>
                      {certificate.certificate_id}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Request ID
                    </span>

                    <strong>
                      {
                        certificate.verification_request_id
                      }
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Status
                    </span>

                    <strong className="valid">
                      {certificate.status ||
                        "VALID"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Issued At
                    </span>

                    <strong>
                      {certificate.issued_at
                        ? new Date(
                            certificate.issued_at
                          ).toLocaleString()
                        : "N/A"}
                    </strong>
                  </div>
                </div>

                <button
                  className="login-button"
                  onClick={() =>
                    downloadCertificate(
                      certificate.certificate_number
                    )
                  }
                >
                  📥 Download Certificate
                </button>

                <button
                  className="secondary-button"
                  onClick={() =>
                    window.open(
                      `/verify/${certificate.certificate_number}`,
                      "_blank"
                    )
                  }
                >
                  🔍 Verify Certificate
                </button>
              </div>
            ))}
          </section>
        </main>

        <footer>
          © 2026 TrueWeight Verification Platform
        </footer>
      </div>
    );
  }

  // =====================================================
  // INSPECTOR DASHBOARD
  // =====================================================

  if (page === "inspector-dashboard") {
    return (
      <div className="app">
        <header className="navbar">
          <div className="logo">
            TRUE<span>WEIGHT</span>
          </div>

          <div className="nav-status">
            Inspector Dashboard
          </div>

          <button
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>
        </header>

        <main className="container">
          <section className="hero">
            <div className="badge">
              👨‍🔧 INSPECTOR
            </div>

            <h1>
              Inspector Dashboard
            </h1>

            <p>
              Manage weighing instrument
              verification requests and certificates.
            </p>
          </section>

          {/* =========================
              INSPECTOR INFO
          ========================= */}

          <section className="verify-card">
            <h2>
              Inspector Information
            </h2>

            <div className="details">
              <div className="detail-row">
                <span>
                  User ID
                </span>

                <strong>
                  {user?.id || "N/A"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  Name
                </span>

                <strong>
                  {user?.name || "Inspector"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  Email
                </span>

                <strong>
                  {user?.email || "N/A"}
                </strong>
              </div>

              <div className="detail-row">
                <span>
                  Role
                </span>

                <strong className="valid">
                  {user?.role || "INSPECTOR"}
                </strong>
              </div>
            </div>
          </section>

          {/* =========================
              INSPECTION
          ========================= */}

          {selectedRequest && (
            <section className="verify-card inspection-card">
              <div className="inspection-header">
                <div>
                  <h2>
                    🔍 Perform Inspection
                  </h2>

                  <p className="card-description">
                    Complete the physical verification
                    of the weighing instrument.
                  </p>
                </div>

                <button
                  className="logout-button"
                  onClick={closeInspection}
                >
                  ✕ Close
                </button>
              </div>

              <div className="details">
                <div className="detail-row">
                  <span>
                    Application ID
                  </span>

                  <strong>
                    {
                      selectedRequest.application_id
                    }
                  </strong>
                </div>

                <div className="detail-row">
                  <span>
                    Request ID
                  </span>

                  <strong>
                    {selectedRequest.request_id}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>
                    Instrument
                  </span>

                  <strong>
                    {
                      selectedRequest.instrument
                        ?.instrument_type ||
                      "N/A"
                    }
                  </strong>
                </div>

                <div className="detail-row">
                  <span>
                    Manufacturer
                  </span>

                  <strong>
                    {
                      selectedRequest.instrument
                        ?.manufacturer ||
                      "N/A"
                    }
                  </strong>
                </div>

                <div className="detail-row">
                  <span>
                    Model
                  </span>

                  <strong>
                    {
                      selectedRequest.instrument
                        ?.model ||
                      "N/A"
                    }
                  </strong>
                </div>

                <div className="detail-row">
                  <span>
                    Serial Number
                  </span>

                  <strong>
                    {
                      selectedRequest.instrument
                        ?.serial_number ||
                      "N/A"
                    }
                  </strong>
                </div>

                <div className="detail-row">
                  <span>
                    Capacity
                  </span>

                  <strong>
                    {
                      selectedRequest.instrument
                        ?.capacity ||
                      "N/A"
                    }
                  </strong>
                </div>

                <div className="detail-row">
                  <span>
                    Location
                  </span>

                  <strong>
                    {
                      selectedRequest.instrument
                        ?.location ||
                      "N/A"
                    }
                  </strong>
                </div>
              </div>

              <hr />

              <h3>
                Inspection Measurements
              </h3>

              <div className="form-group">
                <label>
                  Standard Weight
                </label>

                <input
                  type="number"
                  step="any"
                  placeholder="Example: 10"
                  value={standardWeight}
                  onChange={(e) =>
                    setStandardWeight(
                      e.target.value
                    )
                  }
                />

                <label>
                  Machine Reading
                </label>

                <input
                  type="number"
                  step="any"
                  placeholder="Example: 10.02"
                  value={machineReading}
                  onChange={(e) =>
                    setMachineReading(
                      e.target.value
                    )
                  }
                />

                <label>
                  Permissible Error
                </label>

                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Example: 0.05"
                  value={permissibleError}
                  onChange={(e) =>
                    setPermissibleError(
                      e.target.value
                    )
                  }
                />

                <label>
                  Remarks
                </label>

                <textarea
                  placeholder="Enter inspection remarks (optional)"
                  value={remarks}
                  onChange={(e) =>
                    setRemarks(e.target.value)
                  }
                  rows="4"
                />
              </div>

              {inspectionError && (
                <div className="error-box">
                  ❌ {inspectionError}
                </div>
              )}

              {inspectionResult && (
                <div className="result-card">
                  <div className="verified-icon">
                    {inspectionResult.result ===
                    "PASS"
                      ? "✓"
                      : "✕"}
                  </div>

                  <h2>
                    Inspection Completed
                  </h2>

                  <p className="verified-text">
                    Result:{" "}
                    <strong>
                      {inspectionResult.result}
                    </strong>
                  </p>

                  <div className="details">
                    <div className="detail-row">
                      <span>
                        Standard Weight
                      </span>

                      <strong>
                        {
                          inspectionResult.standard_weight
                        }
                      </strong>
                    </div>

                    <div className="detail-row">
                      <span>
                        Machine Reading
                      </span>

                      <strong>
                        {
                          inspectionResult.machine_reading
                        }
                      </strong>
                    </div>

                    <div className="detail-row">
                      <span>
                        Calculated Error
                      </span>

                      <strong>
                        {
                          inspectionResult.calculated_error
                        }
                      </strong>
                    </div>

                    <div className="detail-row">
                      <span>
                        Permissible Error
                      </span>

                      <strong>
                        {
                          inspectionResult.permissible_error
                        }
                      </strong>
                    </div>
                  </div>

                  {inspectionResult.result ===
                    "PASS" && (
                    <div className="security-message">
                      ✅ Instrument passed verification.
                      You can now generate the official
                      certificate.
                    </div>
                  )}

                  {inspectionResult.result ===
                    "FAIL" && (
                    <div className="error-box">
                      ❌ Instrument failed verification.
                      Certificate cannot be generated.
                    </div>
                  )}
                </div>
              )}

              {inspectionResult &&
                inspectionResult.result ===
                  "PASS" &&
                !certificateResult && (
                  <button
                    className="login-button"
                    onClick={generateCertificate}
                    disabled={certificateLoading}
                  >
                    {certificateLoading
                      ? "Generating Certificate..."
                      : "📜 Generate Certificate"}
                  </button>
                )}

              {certificateError && (
                <div className="error-box">
                  ❌ {certificateError}
                </div>
              )}

              {certificateResult && (
                <div className="result-card">
                  <div className="verified-icon">
                    ✓
                  </div>

                  <h2>
                    Certificate Generated
                  </h2>

                  <p className="verified-text">
                    The verification certificate was
                    generated successfully.
                  </p>

                  <div className="details">
                    <div className="detail-row">
                      <span>
                        Certificate Number
                      </span>

                      <strong>
                        {
                          certificateResult.certificate_number
                        }
                      </strong>
                    </div>

                    <div className="detail-row">
                      <span>
                        Certificate ID
                      </span>

                      <strong>
                        {
                          certificateResult.certificate_id
                        }
                      </strong>
                    </div>

                    <div className="detail-row">
                      <span>
                        Verification Request
                      </span>

                      <strong>
                        {
                          certificateResult.verification_request_id
                        }
                      </strong>
                    </div>

                    <div className="detail-row">
                      <span>
                        Inspection ID
                      </span>

                      <strong>
                        {
                          certificateResult.inspection_id
                        }
                      </strong>
                    </div>

                    <div className="detail-row">
                      <span>
                        Result
                      </span>

                      <strong className="valid">
                        {certificateResult.result}
                      </strong>
                    </div>
                  </div>

                  <div className="security-message">
                    🛡️ Certificate is ready and can be
                    verified using the QR code.
                  </div>

                  <button
                    className="login-button"
                    onClick={() =>
                      downloadCertificate(
                        certificateResult.certificate_number
                      )
                    }
                  >
                    📥 Download Certificate PDF
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      window.open(
                        `/verify/${certificateResult.certificate_number}`,
                        "_blank"
                      )
                    }
                  >
                    🔍 Open Verification Page
                  </button>
                </div>
              )}

              {!inspectionResult && (
                <button
                  className="login-button"
                  onClick={submitInspection}
                  disabled={inspectionLoading}
                >
                  {inspectionLoading
                    ? "Submitting Inspection..."
                    : "✅ Submit Inspection"}
                </button>
              )}
            </section>
          )}

          {/* =========================
              REQUESTS
          ========================= */}

          <section className="verify-card">
            <h2>
              📋 Verification Requests
            </h2>

            <p className="card-description">
              Requests submitted by merchants.
            </p>

            <button
              className="login-button"
              onClick={loadRequests}
              disabled={requestsLoading}
            >
              {requestsLoading
                ? "Loading Requests..."
                : "🔄 Refresh Requests"}
            </button>

            {requestsError && (
              <div className="error-box">
                ❌ {requestsError}
              </div>
            )}

            {!requestsLoading &&
              !requestsError &&
              requests.length === 0 && (
                <div className="loading-box">
                  📋 No verification requests found.
                </div>
              )}

            {requests.map((request) => (
              <div
                className="result-card"
                key={request.request_id}
              >
                <div className="verified-icon">
                  {request.status === "PENDING"
                    ? "!"
                    : request.status === "VERIFIED"
                    ? "✓"
                    : "✕"}
                </div>

                <h2>
                  {request.application_id}
                </h2>

                <p className="verified-text">
                  Verification Request
                </p>

                <div className="details">
                  <div className="detail-row">
                    <span>
                      Request ID
                    </span>

                    <strong>
                      {request.request_id}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Instrument ID
                    </span>

                    <strong>
                      {request.instrument_id}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Status
                    </span>

                    <strong
                      className={
                        request.status ===
                        "VERIFIED"
                          ? "valid"
                          : ""
                      }
                    >
                      {request.status}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Instrument Type
                    </span>

                    <strong>
                      {
                        request.instrument
                          ?.instrument_type ||
                        "N/A"
                      }
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Manufacturer
                    </span>

                    <strong>
                      {
                        request.instrument
                          ?.manufacturer ||
                        "N/A"
                      }
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Model
                    </span>

                    <strong>
                      {
                        request.instrument
                          ?.model ||
                        "N/A"
                      }
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Serial Number
                    </span>

                    <strong>
                      {
                        request.instrument
                          ?.serial_number ||
                        "N/A"
                      }
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Capacity
                    </span>

                    <strong>
                      {
                        request.instrument
                          ?.capacity ||
                        "N/A"
                      }
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Location
                    </span>

                    <strong>
                      {
                        request.instrument
                          ?.location ||
                        "N/A"
                      }
                    </strong>
                  </div>
                </div>

                {request.status === "PENDING" && (
                  <button
                    className="login-button"
                    onClick={() =>
                      openInspection(request)
                    }
                  >
                    🔍 Perform Inspection
                  </button>
                )}

                {request.status ===
                  "VERIFIED" && (
                  <div className="security-message">
                    ✅ Inspection completed and
                    instrument verified.
                  </div>
                )}

                {request.status ===
                  "REJECTED" && (
                  <div className="error-box">
                    ❌ This instrument was rejected.
                  </div>
                )}
              </div>
            ))}
          </section>
        </main>

        <footer>
          © 2026 TrueWeight Verification Platform
        </footer>
      </div>
    );
  }

  return null;
}

export default App;