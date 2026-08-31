import { useEffect, useState } from "react";
import "./index.css";

const BACKEND_URL = "http://192.168.29.127:8000";

function App() {
  const [page, setPage] = useState("role-select");

  // =====================================================
  // AUTH
  // =====================================================

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [token, setToken] = useState(
    localStorage.getItem("trueweight_token") || ""
  );

  const [user, setUser] = useState(null);

  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  // =====================================================
  // INSPECTOR - VERIFICATION REQUESTS
  // =====================================================

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState("");

  // =====================================================
  // INSPECTOR - INSPECTION
  // =====================================================

  const [selectedRequest, setSelectedRequest] = useState(null);

  const [standardWeight, setStandardWeight] = useState("");
  const [machineReading, setMachineReading] = useState("");
  const [permissibleError, setPermissibleError] = useState("");
  const [remarks, setRemarks] = useState("");

  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [inspectionError, setInspectionError] = useState("");
  const [inspectionResult, setInspectionResult] = useState(null);

  // =====================================================
  // MERCHANT - INSTRUMENT
  // =====================================================

  const [instrumentType, setInstrumentType] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [capacity, setCapacity] = useState("");
  const [location, setLocation] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");

  const [instrumentLoading, setInstrumentLoading] = useState(false);
  const [instrumentError, setInstrumentError] = useState("");
  const [instrumentSuccess, setInstrumentSuccess] = useState(null);

  // =====================================================
  // MERCHANT - MY INSTRUMENTS
  // =====================================================

  const [instruments, setInstruments] = useState([]);
  const [instrumentsLoading, setInstrumentsLoading] = useState(false);
  const [instrumentsError, setInstrumentsError] = useState("");

  // =====================================================
  // MERCHANT - VERIFICATION
  // =====================================================

  const [merchantRequests, setMerchantRequests] = useState([]);
  const [merchantRequestsLoading, setMerchantRequestsLoading] =
    useState(false);
  const [merchantRequestsError, setMerchantRequestsError] = useState("");

  const [selectedInstrumentId, setSelectedInstrumentId] = useState("");

  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [verificationSuccess, setVerificationSuccess] = useState(null);

  // =====================================================
  // CHECK EXISTING LOGIN
  // =====================================================

  useEffect(() => {
    if (token) {
      getCurrentUser(token);
    }
  }, []);

  // =====================================================
  // GET CURRENT USER
  // =====================================================

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
        setPage("dashboard");
      } else if (data.role === "SHOPKEEPER") {
        setPage("merchant-dashboard");
      } else {
        throw new Error("Invalid user role");
      }
    } catch (error) {
      console.error("Current user error:", error);

      localStorage.removeItem("trueweight_token");

      setToken("");
      setUser(null);
      setPage("role-select");
    }
  };

  // =====================================================
  // LOGIN
  // =====================================================

  const login = async () => {
    if (!email.trim() || !password.trim()) {
      setLoginError("Please enter email and password");
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
        throw new Error(
          data.detail || "Invalid email or password"
        );
      }

      localStorage.setItem(
        "trueweight_token",
        data.access_token
      );

      setToken(data.access_token);

      await getCurrentUser(data.access_token);
    } catch (error) {
      console.error("Login error:", error);

      setLoginError(
        error.message || "Failed to login"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = () => {
    localStorage.removeItem("trueweight_token");

    setToken("");
    setUser(null);

    setEmail("");
    setPassword("");

    setRequests([]);
    setMerchantRequests([]);
    setInstruments([]);

    closeInspection();

    setPage("role-select");
  };

  // =====================================================
  // RESET LOGIN
  // =====================================================

  const goToLogin = (role) => {
    setEmail("");
    setPassword("");
    setLoginError("");

    if (role === "INSPECTOR") {
      setPage("login");
    } else {
      setPage("merchant-login");
    }
  };

  // =====================================================
  // INSPECTOR
  // LOAD VERIFICATION REQUESTS
  // =====================================================

  const loadRequests = async () => {
    if (!token) {
      setRequestsError("Please login first");
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

      setRequests(Array.isArray(data) ? data : []);
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
  // LOAD INSPECTOR REQUESTS
  // =====================================================

  useEffect(() => {
    if (page === "dashboard" && token) {
      loadRequests();
    }
  }, [page, token]);

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

    if (permissible < 0) {
      setInspectionError(
        "Permissible error cannot be negative."
      );
      return;
    }

    setInspectionLoading(true);
    setInspectionError("");
    setInspectionResult(null);

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
  // MERCHANT - LOAD INSTRUMENTS
  // =====================================================

  const loadInstruments = async () => {
    if (!token) return;

    setInstrumentsLoading(true);
    setInstrumentsError("");

    try {
      const response = await fetch(
        `${BACKEND_URL}/instruments/`,
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
            "Failed to load instruments"
        );
      }

      setInstruments(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Instrument loading error:",
        error
      );

      setInstrumentsError(
        error.message ||
          "Failed to load instruments"
      );
    } finally {
      setInstrumentsLoading(false);
    }
  };

  // =====================================================
  // MERCHANT - LOAD MY REQUESTS
  // =====================================================

  const loadMerchantRequests = async () => {
    if (!token) return;

    setMerchantRequestsLoading(true);
    setMerchantRequestsError("");

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
          data.detail ||
            "Failed to load verification requests"
        );
      }

      setMerchantRequests(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Merchant requests error:",
        error
      );

      setMerchantRequestsError(
        error.message ||
          "Failed to load verification requests"
      );
    } finally {
      setMerchantRequestsLoading(false);
    }
  };

  // =====================================================
  // LOAD MERCHANT DATA
  // =====================================================

  useEffect(() => {
    if (
      page === "merchant-dashboard" &&
      token
    ) {
      loadInstruments();
      loadMerchantRequests();
    }
  }, [page, token]);

  // =====================================================
  // MERCHANT - CREATE INSTRUMENT
  // =====================================================

  const createInstrument = async () => {
    if (
      !instrumentType.trim() ||
      !manufacturer.trim() ||
      !model.trim() ||
      !serialNumber.trim() ||
      !capacity.trim() ||
      !location.trim()
    ) {
      setInstrumentError(
        "Please fill all required instrument fields."
      );
      return;
    }

    setInstrumentLoading(true);
    setInstrumentError("");
    setInstrumentSuccess(null);

    try {
      const params = new URLSearchParams();

      params.append(
        "unique_id",
        `TW-${Date.now()}`
      );

      params.append(
        "instrument_type",
        instrumentType.trim()
      );

      params.append(
        "manufacturer",
        manufacturer.trim()
      );

      params.append(
        "model",
        model.trim()
      );

      params.append(
        "serial_number",
        serialNumber.trim()
      );

      params.append(
        "capacity",
        capacity.trim()
      );

      params.append(
        "location",
        location.trim()
      );

      if (purchaseDate) {
        params.append(
          "purchase_date",
          purchaseDate
        );
      }

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
          data.detail ||
            "Failed to register instrument"
        );
      }

      setInstrumentSuccess(data);

      setInstrumentType("");
      setManufacturer("");
      setModel("");
      setSerialNumber("");
      setCapacity("");
      setLocation("");
      setPurchaseDate("");

      await loadInstruments();
    } catch (error) {
      console.error(
        "Create instrument error:",
        error
      );

      setInstrumentError(
        error.message ||
          "Failed to register instrument"
      );
    } finally {
      setInstrumentLoading(false);
    }
  };

  // =====================================================
  // MERCHANT - CREATE VERIFICATION REQUEST
  // =====================================================

  const createVerificationRequest = async () => {
    if (!selectedInstrumentId) {
      setVerificationError(
        "Please select an instrument."
      );
      return;
    }

    setVerificationLoading(true);
    setVerificationError("");
    setVerificationSuccess(null);

    try {
      const params = new URLSearchParams();

      params.append(
        "instrument_id",
        selectedInstrumentId
      );

      const response = await fetch(
        `${BACKEND_URL}/verification/request?${params.toString()}`,
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
            "Failed to create verification request"
        );
      }

      setVerificationSuccess(data);
      setSelectedInstrumentId("");

      await loadMerchantRequests();
    } catch (error) {
      console.error(
        "Verification request error:",
        error
      );

      setVerificationError(
        error.message ||
          "Failed to create verification request"
      );
    } finally {
      setVerificationLoading(false);
    }
  };

  // =====================================================
  // ROLE SELECTION PAGE
  // =====================================================

  if (page === "role-select") {
    return (
      <div className="app">

        <header className="navbar">
          <div className="logo">
            TRUE<span>WEIGHT</span>
          </div>

          <div className="nav-status">
            Verification & Certification Platform
          </div>
        </header>

        <main className="container">

          <section className="hero">
            <div className="badge">
              ⚖️ TRUEWEIGHT
            </div>

            <h1>
              Verification Platform
            </h1>

            <p>
              Secure weighing instrument
              verification and certification.
            </p>
          </section>

          <section className="verify-card">

            <h2>
              Choose Login
            </h2>

            <p className="card-description">
              Select your portal to continue.
            </p>

            <button
              className="login-button"
              onClick={() =>
                goToLogin("SHOPKEEPER")
              }
            >
              🏪 Merchant Login
            </button>

            <button
              className="login-button"
              onClick={() =>
                goToLogin("INSPECTOR")
              }
            >
              👨‍🔧 Inspector Login
            </button>

          </section>

        </main>

        <footer>
          <p>
            © 2026 TrueWeight Verification Platform
          </p>
        </footer>

      </div>
    );
  }

  // =====================================================
  // LOGIN PAGE
  // =====================================================

  if (
    page === "login" ||
    page === "merchant-login"
  ) {
    const isMerchant =
      page === "merchant-login";

    return (
      <div className="app">

        <header className="navbar">

          <div className="logo">
            TRUE<span>WEIGHT</span>
          </div>

          <div className="nav-status">
            {isMerchant
              ? "Merchant Portal"
              : "Inspector Portal"}
          </div>

        </header>

        <main className="container">

          <section className="hero">

            <div className="badge">
              {isMerchant
                ? "🏪 MERCHANT"
                : "👨‍🔧 INSPECTOR"}
            </div>

            <h1>
              {isMerchant
                ? "Merchant Login"
                : "Inspector Login"}
            </h1>

            <p>
              Login to the TrueWeight
              Verification Platform.
            </p>

          </section>

          <section className="verify-card">

            <h2>
              {isMerchant
                ? "Merchant Login"
                : "Inspector Login"}
            </h2>

            <p className="card-description">
              Enter your registered email
              and password.
            </p>

            <div className="input-group">

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setLoginError("");
                }}
              />

              <input
                type="password"
                placeholder="Password"
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
              className="login-button"
              onClick={() =>
                setPage("role-select")
              }
            >
              ← Back to Login Options
            </button>

          </section>

        </main>

        <footer>
          <p>
            © 2026 TrueWeight Verification Platform
          </p>
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
              Register your weighing instruments
              and request official verification.
            </p>

          </section>

          {/* =========================
              MERCHANT INFORMATION
          ========================== */}

          <section className="verify-card">

            <h2>
              Merchant Information
            </h2>

            <div className="details">

              <div className="detail-row">
                <span>User ID</span>

                <strong>
                  {user?.id || "N/A"}
                </strong>
              </div>

              <div className="detail-row">
                <span>Name</span>

                <strong>
                  {user?.name || "Merchant"}
                </strong>
              </div>

              <div className="detail-row">
                <span>Email</span>

                <strong>
                  {user?.email || "N/A"}
                </strong>
              </div>

              <div className="detail-row">
                <span>Role</span>

                <strong className="valid">
                  {user?.role || "SHOPKEEPER"}
                </strong>
              </div>

            </div>

          </section>

          {/* =========================
              REGISTER INSTRUMENT
          ========================== */}

          <section className="verify-card">

            <h2>
              Register Weighing Instrument
            </h2>

            <p className="card-description">
              Add your weighing instrument
              to the TrueWeight platform.
            </p>

            <div className="input-group">

              <input
                type="text"
                placeholder="Instrument Type"
                value={instrumentType}
                onChange={(e) =>
                  setInstrumentType(
                    e.target.value
                  )
                }
              />

              <input
                type="text"
                placeholder="Manufacturer"
                value={manufacturer}
                onChange={(e) =>
                  setManufacturer(
                    e.target.value
                  )
                }
              />

              <input
                type="text"
                placeholder="Model"
                value={model}
                onChange={(e) =>
                  setModel(e.target.value)
                }
              />

              <input
                type="text"
                placeholder="Serial Number"
                value={serialNumber}
                onChange={(e) =>
                  setSerialNumber(
                    e.target.value
                  )
                }
              />

              <input
                type="text"
                placeholder="Capacity e.g. 100 kg"
                value={capacity}
                onChange={(e) =>
                  setCapacity(
                    e.target.value
                  )
                }
              />

              <input
                type="text"
                placeholder="Location"
                value={location}
                onChange={(e) =>
                  setLocation(
                    e.target.value
                  )
                }
              />

              <label>
                Purchase Date
              </label>

              <input
                type="date"
                value={purchaseDate}
                onChange={(e) =>
                  setPurchaseDate(
                    e.target.value
                  )
                }
              />

            </div>

            {instrumentError && (
              <div className="error-box">
                ❌ {instrumentError}
              </div>
            )}

            {instrumentSuccess && (
              <div className="security-message">
                ✅ Instrument registered successfully.
                <br />
                Instrument ID:{" "}
                <strong>
                  {instrumentSuccess.instrument_id}
                </strong>
              </div>
            )}

            <button
              className="login-button"
              onClick={createInstrument}
              disabled={instrumentLoading}
            >
              {instrumentLoading
                ? "Registering..."
                : "➕ Register Instrument"}
            </button>

          </section>

          {/* =========================
              MY INSTRUMENTS
          ========================== */}

          <section className="verify-card">

            <h2>
              My Instruments
            </h2>

            <p className="card-description">
              Instruments registered by you.
            </p>

            <button
              className="login-button"
              onClick={loadInstruments}
              disabled={instrumentsLoading}
            >
              {instrumentsLoading
                ? "Loading..."
                : "🔄 Refresh Instruments"}
            </button>

            {instrumentsError && (
              <div className="error-box">
                ❌ {instrumentsError}
              </div>
            )}

            {!instrumentsLoading &&
              instruments.length === 0 && (
                <div className="loading-box">
                  📋 No instruments registered yet.
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
                  {instrument.instrument_type}
                </h2>

                <div className="details">

                  <div className="detail-row">
                    <span>Instrument ID</span>

                    <strong>
                      {instrument.id}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>Unique ID</span>

                    <strong>
                      {instrument.unique_id}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>Manufacturer</span>

                    <strong>
                      {instrument.manufacturer}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>Model</span>

                    <strong>
                      {instrument.model}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>Serial Number</span>

                    <strong>
                      {instrument.serial_number}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>Capacity</span>

                    <strong>
                      {instrument.capacity}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>Location</span>

                    <strong>
                      {instrument.location}
                    </strong>
                  </div>

                </div>

              </div>
            ))}

          </section>

          {/* =========================
              REQUEST VERIFICATION
          ========================== */}

          <section className="verify-card">

            <h2>
              Request Verification
            </h2>

            <p className="card-description">
              Select a registered instrument
              and request physical inspection.
            </p>

            <select
              value={selectedInstrumentId}
              onChange={(e) =>
                setSelectedInstrumentId(
                  e.target.value
                )
              }
              style={{
                width: "100%",
                height: "50px",
                border: "1px solid #d0d5dd",
                borderRadius: "9px",
                padding: "0 15px",
                fontSize: "15px",
                background: "white",
              }}
            >

              <option value="">
                Select Instrument
              </option>

              {instruments.map((instrument) => (
                <option
                  key={instrument.id}
                  value={instrument.id}
                >
                  {instrument.instrument_type} -{" "}
                  {instrument.serial_number}
                </option>
              ))}

            </select>

            {verificationError && (
              <div className="error-box">
                ❌ {verificationError}
              </div>
            )}

            {verificationSuccess && (
              <div className="security-message">
                ✅ Verification request created.
                <br />
                Application ID:{" "}
                <strong>
                  {verificationSuccess.application_id}
                </strong>
              </div>
            )}

            <button
              className="login-button"
              onClick={createVerificationRequest}
              disabled={verificationLoading}
            >
              {verificationLoading
                ? "Submitting..."
                : "🔍 Request Verification"}
            </button>

          </section>

          {/* =========================
              MY VERIFICATION REQUESTS
          ========================== */}

          <section className="verify-card">

            <h2>
              My Verification Requests
            </h2>

            <p className="card-description">
              Track the verification status
              of your instruments.
            </p>

            <button
              className="login-button"
              onClick={loadMerchantRequests}
              disabled={merchantRequestsLoading}
            >
              {merchantRequestsLoading
                ? "Loading..."
                : "🔄 Refresh Status"}
            </button>

            {merchantRequestsError && (
              <div className="error-box">
                ❌ {merchantRequestsError}
              </div>
            )}

            {!merchantRequestsLoading &&
              merchantRequests.length === 0 && (
                <div className="loading-box">
                  📋 No verification requests yet.
                </div>
              )}

            {merchantRequests.map((request) => (
              <div
                className="result-card"
                key={request.request_id}
              >

                <div className="verified-icon">
                  {request.status === "VERIFIED"
                    ? "✓"
                    : request.status === "REJECTED"
                    ? "✕"
                    : "!"}
                </div>

                <h2>
                  {request.application_id}
                </h2>

                <p className="verified-text">
                  Verification Request
                </p>

                <div className="details">

                  <div className="detail-row">
                    <span>Application ID</span>

                    <strong>
                      {request.application_id}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>Request ID</span>

                    <strong>
                      {request.request_id}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>Instrument ID</span>

                    <strong>
                      {request.instrument_id}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>Status</span>

                    <strong
                      className={
                        request.status === "VERIFIED"
                          ? "valid"
                          : ""
                      }
                    >
                      {request.status}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>Instrument</span>

                    <strong>
                      {request.instrument
                        ?.instrument_type || "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>Manufacturer</span>

                    <strong>
                      {request.instrument
                        ?.manufacturer || "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>Serial Number</span>

                    <strong>
                      {request.instrument
                        ?.serial_number || "N/A"}
                    </strong>
                  </div>

                </div>

                {request.status === "PENDING" && (
                  <div className="security-message">
                    ⏳ Waiting for inspector physical
                    inspection.
                  </div>
                )}

                {request.status === "VERIFIED" && (
                  <div className="security-message">
                    ✅ Instrument verified successfully.
                  </div>
                )}

                {request.status === "REJECTED" && (
                  <div className="error-box">
                    ❌ Instrument failed verification.
                  </div>
                )}

              </div>
            ))}

          </section>

        </main>

        <footer>
          <p>
            © 2026 TrueWeight Verification Platform
          </p>
        </footer>

      </div>
    );
  }

  // =====================================================
  // INSPECTOR DASHBOARD
  // =====================================================

  if (page === "dashboard") {
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
              verification requests.
            </p>

          </section>

          {/* =========================
              INSPECTOR INFORMATION
          ========================== */}

          <section className="verify-card">

            <h2>
              Inspector Information
            </h2>

            <div className="details">

              <div className="detail-row">
                <span>User ID</span>

                <strong>
                  {user?.id || "N/A"}
                </strong>
              </div>

              <div className="detail-row">
                <span>Name</span>

                <strong>
                  {user?.name || "Inspector"}
                </strong>
              </div>

              <div className="detail-row">
                <span>Email</span>

                <strong>
                  {user?.email || "N/A"}
                </strong>
              </div>

              <div className="detail-row">
                <span>Role</span>

                <strong className="valid">
                  {user?.role || "INSPECTOR"}
                </strong>
              </div>

            </div>

          </section>

          {/* =========================
              INSPECTION FORM
          ========================== */}

          {selectedRequest && (
            <section className="verify-card inspection-card">

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "20px",
                  marginBottom: "20px",
                }}
              >

                <div>
                  <h2>
                    Perform Inspection
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
                  <span>Application ID</span>

                  <strong>
                    {selectedRequest.application_id}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>Request ID</span>

                  <strong>
                    {selectedRequest.request_id}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>Instrument</span>

                  <strong>
                    {selectedRequest.instrument
                      ?.instrument_type || "N/A"}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>Manufacturer</span>

                  <strong>
                    {selectedRequest.instrument
                      ?.manufacturer || "N/A"}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>Model</span>

                  <strong>
                    {selectedRequest.instrument
                      ?.model || "N/A"}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>Serial Number</span>

                  <strong>
                    {selectedRequest.instrument
                      ?.serial_number || "N/A"}
                  </strong>
                </div>

              </div>

              <hr />

              <h3>
                Physical Inspection Measurements
              </h3>

              <div
                className="input-group"
                style={{
                  marginTop: "20px",
                }}
              >

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
                  placeholder="Enter inspection remarks"
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
                    {inspectionResult.result === "PASS"
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
                        {inspectionResult.standard_weight}
                      </strong>
                    </div>

                    <div className="detail-row">
                      <span>
                        Machine Reading
                      </span>

                      <strong>
                        {inspectionResult.machine_reading}
                      </strong>
                    </div>

                    <div className="detail-row">
                      <span>
                        Calculated Error
                      </span>

                      <strong>
                        {inspectionResult.calculated_error}
                      </strong>
                    </div>

                    <div className="detail-row">
                      <span>
                        Permissible Error
                      </span>

                      <strong>
                        {inspectionResult.permissible_error}
                      </strong>
                    </div>

                  </div>

                  <div className="security-message">
                    {inspectionResult.result === "PASS"
                      ? "✅ Instrument passed verification. Status changed to VERIFIED."
                      : "❌ Instrument failed verification. Status changed to REJECTED."}
                  </div>

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
              VERIFICATION REQUESTS
          ========================== */}

          <section className="verify-card">

            <h2>
              Verification Requests
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
                      Application ID
                    </span>

                    <strong>
                      {request.application_id}
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
                        request.status === "VERIFIED"
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
                      {request.instrument
                        ?.instrument_type || "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Manufacturer
                    </span>

                    <strong>
                      {request.instrument
                        ?.manufacturer || "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Model
                    </span>

                    <strong>
                      {request.instrument
                        ?.model || "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Serial Number
                    </span>

                    <strong>
                      {request.instrument
                        ?.serial_number || "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Capacity
                    </span>

                    <strong>
                      {request.instrument
                        ?.capacity || "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Location
                    </span>

                    <strong>
                      {request.instrument
                        ?.location || "N/A"}
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
                    🔍 Perform Physical Inspection
                  </button>
                )}

                {request.status === "VERIFIED" && (
                  <div className="security-message">
                    ✅ Inspection completed successfully.
                  </div>
                )}

                {request.status === "REJECTED" && (
                  <div className="error-box">
                    ❌ This instrument was rejected.
                  </div>
                )}

              </div>

            ))}

          </section>

        </main>

        <footer>
          <p>
            © 2026 TrueWeight Verification Platform
          </p>
        </footer>

      </div>
    );
  }

  return null;
}

export default App;