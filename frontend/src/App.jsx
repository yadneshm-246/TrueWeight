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
  // MERCHANT - INSTRUMENTS
  // =========================

  const [instruments, setInstruments] = useState([]);
  const [instrumentsLoading, setInstrumentsLoading] = useState(false);
  const [instrumentsError, setInstrumentsError] = useState("");

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

  const [instrumentCreating, setInstrumentCreating] = useState(false);
  const [instrumentMessage, setInstrumentMessage] = useState("");

  // =========================
  // MERCHANT - VERIFICATION
  // =========================

  const [myRequests, setMyRequests] = useState([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);
  const [myRequestsError, setMyRequestsError] = useState("");

  const [requestLoading, setRequestLoading] = useState(null);

  // =========================
  // INSPECTOR
  // =========================

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState("");

  const [selectedRequest, setSelectedRequest] = useState(null);

  const [standardWeight, setStandardWeight] = useState("");
  const [machineReading, setMachineReading] = useState("");
  const [permissibleError, setPermissibleError] = useState("");
  const [remarks, setRemarks] = useState("");

  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [inspectionError, setInspectionError] = useState("");
  const [inspectionResult, setInspectionResult] = useState(null);

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

      localStorage.setItem("trueweight_token", data.access_token);

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

    setInstruments([]);
    setMyRequests([]);
    setRequests([]);

    closeInspection();

    setSelectedRole("");
    setPage("role-select");
  };

  // =====================================================
  // MERCHANT - LOAD INSTRUMENTS
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
      console.error("Instrument loading error:", error);

      setInstrumentsError(
        error.message || "Failed to load instruments"
      );
    } finally {
      setInstrumentsLoading(false);
    }
  };

  // =====================================================
  // MERCHANT - CREATE INSTRUMENT
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
        setInstrumentMessage(
          `Please enter ${field.replaceAll("_", " ")}.`
        );
        return;
      }
    }

    setInstrumentCreating(true);
    setInstrumentMessage("");

    try {
      const params = new URLSearchParams();

      params.append("unique_id", instrumentForm.unique_id.trim());
      params.append(
        "instrument_type",
        instrumentForm.instrument_type.trim()
      );
      params.append(
        "manufacturer",
        instrumentForm.manufacturer.trim()
      );
      params.append("model", instrumentForm.model.trim());
      params.append(
        "serial_number",
        instrumentForm.serial_number.trim()
      );
      params.append("capacity", instrumentForm.capacity.trim());
      params.append("location", instrumentForm.location.trim());

      if (instrumentForm.purchase_date) {
        params.append(
          "purchase_date",
          instrumentForm.purchase_date
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
          data.detail || "Failed to create instrument"
        );
      }

      setInstrumentMessage(
        "✅ Instrument registered successfully."
      );

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

      await loadInstruments();
    } catch (error) {
      console.error("Create instrument error:", error);

      setInstrumentMessage(
        `❌ ${error.message || "Failed to register instrument"}`
      );
    } finally {
      setInstrumentCreating(false);
    }
  };

  // =====================================================
  // MERCHANT - LOAD MY VERIFICATION REQUESTS
  // =====================================================

  const loadMyRequests = async () => {
    if (!token) return;

    setMyRequestsLoading(true);
    setMyRequestsError("");

    try {
      const response = await fetch(`${BACKEND_URL}/verification/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to load verification requests"
        );
      }

      setMyRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("My requests error:", error);

      setMyRequestsError(
        error.message || "Failed to load verification requests"
      );
    } finally {
      setMyRequestsLoading(false);
    }
  };

  // =====================================================
  // MERCHANT - REQUEST VERIFICATION
  // =====================================================

  const requestVerification = async (instrumentId) => {
    setRequestLoading(instrumentId);
    setMyRequestsError("");

    try {
      const params = new URLSearchParams();

      params.append("instrument_id", instrumentId);

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
          data.detail || "Failed to create verification request"
        );
      }

      alert(
        `Verification request created!\nApplication ID: ${data.application_id}`
      );

      await loadMyRequests();
    } catch (error) {
      console.error("Verification request error:", error);

      alert(
        error.message || "Failed to create verification request"
      );
    } finally {
      setRequestLoading(null);
    }
  };

  // =====================================================
  // MERCHANT DATA LOAD
  // =====================================================

  useEffect(() => {
    if (
      page === "merchant-dashboard" &&
      token &&
      user?.role === "SHOPKEEPER"
    ) {
      loadInstruments();
      loadMyRequests();
    }
  }, [page, token, user]);

  // =====================================================
  // INSPECTOR - LOAD REQUESTS
  // =====================================================

  const loadRequests = async () => {
    if (!token) {
      setRequestsError("Please login first.");
      return;
    }

    setRequestsLoading(true);
    setRequestsError("");

    try {
      const response = await fetch(`${BACKEND_URL}/verification/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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
  // INSPECTOR REQUEST LOAD
  // =====================================================

  useEffect(() => {
    if (
      page === "inspector-dashboard" &&
      token &&
      user?.role === "INSPECTOR"
    ) {
      loadRequests();
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

    try {
      const params = new URLSearchParams();

      params.append(
        "verification_request_id",
        selectedRequest.request_id
      );

      params.append("standard_weight", standard);
      params.append("machine_reading", reading);
      params.append("permissible_error", permissible);

      if (remarks.trim()) {
        params.append("remarks", remarks.trim());
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
            <h2>Choose Login</h2>

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
                  Register your weighing
                  instruments and request
                  verification.
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
              Manage your weighing instruments
              and verification requests.
            </p>
          </section>

          {/* ACCOUNT INFORMATION */}

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
                <span>User ID</span>
                <strong>
                  {user?.id || "N/A"}
                </strong>
              </div>

              <div className="detail-row">
                <span>Name</span>
                <strong>
                  {user?.name || "N/A"}
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

          {/* REGISTER INSTRUMENT */}

          <section className="verify-card">
            <h2>
              ⚖️ Register Weighing Instrument
            </h2>

            <p className="card-description">
              Add your weighing instrument to
              the TrueWeight platform.
            </p>

            <div className="form-group">
              <label>
                Unique ID *
              </label>

              <input
                type="text"
                placeholder="Example: TW-WM-001"
                value={instrumentForm.unique_id}
                onChange={(e) =>
                  setInstrumentForm({
                    ...instrumentForm,
                    unique_id: e.target.value,
                  })
                }
              />

              <label>
                Instrument Type *
              </label>

              <input
                type="text"
                placeholder="Example: Digital Weighing Machine"
                value={instrumentForm.instrument_type}
                onChange={(e) =>
                  setInstrumentForm({
                    ...instrumentForm,
                    instrument_type: e.target.value,
                  })
                }
              />

              <label>
                Manufacturer *
              </label>

              <input
                type="text"
                placeholder="Example: ABC Instruments"
                value={instrumentForm.manufacturer}
                onChange={(e) =>
                  setInstrumentForm({
                    ...instrumentForm,
                    manufacturer: e.target.value,
                  })
                }
              />

              <label>
                Model *
              </label>

              <input
                type="text"
                placeholder="Example: ABC-100"
                value={instrumentForm.model}
                onChange={(e) =>
                  setInstrumentForm({
                    ...instrumentForm,
                    model: e.target.value,
                  })
                }
              />

              <label>
                Serial Number *
              </label>

              <input
                type="text"
                placeholder="Enter serial number"
                value={instrumentForm.serial_number}
                onChange={(e) =>
                  setInstrumentForm({
                    ...instrumentForm,
                    serial_number: e.target.value,
                  })
                }
              />

              <label>
                Capacity *
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
                Location *
              </label>

              <input
                type="text"
                placeholder="Example: Shop Floor"
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
                    purchase_date: e.target.value,
                  })
                }
              />
            </div>

            {instrumentMessage && (
              <div
                className={
                  instrumentMessage.startsWith("❌")
                    ? "error-box"
                    : "security-message"
                }
              >
                {instrumentMessage}
              </div>
            )}

            <button
              className="login-button"
              onClick={createInstrument}
              disabled={instrumentCreating}
            >
              {instrumentCreating
                ? "Registering Instrument..."
                : "➕ Register Instrument"}
            </button>
          </section>

          {/* MY INSTRUMENTS */}

          <section className="verify-card">
            <div className="inspection-header">
              <div>
                <h2>
                  ⚖️ My Instruments
                </h2>

                <p className="card-description">
                  Instruments registered under
                  your merchant account.
                </p>
              </div>

              <button
                className="secondary-button"
                onClick={loadInstruments}
                disabled={instrumentsLoading}
              >
                🔄 Refresh
              </button>
            </div>

            {instrumentsError && (
              <div className="error-box">
                ❌ {instrumentsError}
              </div>
            )}

            {instrumentsLoading && (
              <div className="loading-box">
                Loading instruments...
              </div>
            )}

            {!instrumentsLoading &&
              !instrumentsError &&
              instruments.length === 0 && (
                <div className="loading-box">
                  ⚖️ No instruments registered yet.
                </div>
              )}

            {instruments.map((instrument) => {
              const existingRequest =
                myRequests.find(
                  (request) =>
                    request.instrument_id ===
                    instrument.id
                );

              return (
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
                    {instrument.instrument_type ||
                      "Weighing Instrument"}
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

                  {existingRequest ? (
                    <div
                      className={
                        existingRequest.status ===
                        "REJECTED"
                          ? "error-box"
                          : "security-message"
                      }
                    >
                      {existingRequest.status ===
                      "PENDING"
                        ? "⏳ Verification request is pending."
                        : existingRequest.status ===
                          "VERIFIED"
                        ? "✅ Instrument is VERIFIED."
                        : "❌ Instrument was REJECTED."}
                      <br />
                      <strong>
                        Application ID:{" "}
                        {existingRequest.application_id}
                      </strong>
                    </div>
                  ) : (
                    <button
                      className="login-button"
                      onClick={() =>
                        requestVerification(
                          instrument.id
                        )
                      }
                      disabled={
                        requestLoading === instrument.id
                      }
                    >
                      {requestLoading ===
                      instrument.id
                        ? "Requesting..."
                        : "📋 Request Verification"}
                    </button>
                  )}
                </div>
              );
            })}
          </section>

          {/* MY VERIFICATION REQUESTS */}

          <section className="verify-card">
            <div className="inspection-header">
              <div>
                <h2>
                  📋 My Verification Requests
                </h2>

                <p className="card-description">
                  Track your submitted verification
                  applications.
                </p>
              </div>

              <button
                className="secondary-button"
                onClick={loadMyRequests}
                disabled={myRequestsLoading}
              >
                🔄 Refresh
              </button>
            </div>

            {myRequestsError && (
              <div className="error-box">
                ❌ {myRequestsError}
              </div>
            )}

            {myRequestsLoading && (
              <div className="loading-box">
                Loading verification requests...
              </div>
            )}

            {!myRequestsLoading &&
              !myRequestsError &&
              myRequests.length === 0 && (
                <div className="loading-box">
                  📋 No verification requests yet.
                </div>
              )}

            {myRequests.map((request) => (
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
                  Verification Application
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
                      Instrument
                    </span>

                    <strong>
                      {request.instrument
                        ?.instrument_type ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Manufacturer
                    </span>

                    <strong>
                      {request.instrument
                        ?.manufacturer ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Serial Number
                    </span>

                    <strong>
                      {request.instrument
                        ?.serial_number ||
                        "N/A"}
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
                </div>

                {request.status ===
                  "PENDING" && (
                  <div className="security-message">
                    ⏳ Waiting for inspector
                    verification.
                  </div>
                )}

                {request.status ===
                  "VERIFIED" && (
                  <div className="security-message">
                    ✅ Your instrument has passed
                    verification.
                  </div>
                )}

                {request.status ===
                  "REJECTED" && (
                  <div className="error-box">
                    ❌ Your instrument did not pass
                    verification.
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
              verification requests.
            </p>
          </section>

          {/* INSPECTOR INFORMATION */}

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

          {/* INSPECTION FORM */}

          {selectedRequest && (
            <section className="verify-card inspection-card">
              <div className="inspection-header">
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
                  <span>
                    Application ID
                  </span>

                  <strong>
                    {selectedRequest.application_id}
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
                    {selectedRequest.instrument
                      ?.instrument_type ||
                      "N/A"}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>
                    Manufacturer
                  </span>

                  <strong>
                    {selectedRequest.instrument
                      ?.manufacturer ||
                      "N/A"}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>
                    Model
                  </span>

                  <strong>
                    {selectedRequest.instrument
                      ?.model ||
                      "N/A"}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>
                    Serial Number
                  </span>

                  <strong>
                    {selectedRequest.instrument
                      ?.serial_number ||
                      "N/A"}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>
                    Capacity
                  </span>

                  <strong>
                    {selectedRequest.instrument
                      ?.capacity ||
                      "N/A"}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>
                    Location
                  </span>

                  <strong>
                    {selectedRequest.instrument
                      ?.location ||
                      "N/A"}
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
                  min="0"
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
                  min="0"
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

                    <div className="detail-row">
                      <span>
                        Inspector ID
                      </span>

                      <strong>
                        {
                          inspectionResult.inspector_id
                        }
                      </strong>
                    </div>
                  </div>

                  <div className="security-message">
                    {inspectionResult.result ===
                    "PASS"
                      ? "✅ Instrument passed verification. Status changed to VERIFIED."
                      : "❌ Instrument failed verification. Status changed to REJECTED."}
                  </div>

                  {inspectionResult.remarks && (
                    <div className="security-message">
                      <strong>
                        Remarks:
                      </strong>{" "}
                      {inspectionResult.remarks}
                    </div>
                  )}
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

          {/* REQUESTS */}

          <section className="verify-card">
            <div className="inspection-header">
              <div>
                <h2>
                  Verification Requests
                </h2>

                <p className="card-description">
                  Requests submitted by merchants.
                </p>
              </div>

              <button
                className="secondary-button"
                onClick={loadRequests}
                disabled={requestsLoading}
              >
                🔄 Refresh
              </button>
            </div>

            {requestsError && (
              <div className="error-box">
                ❌ {requestsError}
              </div>
            )}

            {requestsLoading && (
              <div className="loading-box">
                Loading requests...
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
                  {request.status ===
                  "PENDING"
                    ? "!"
                    : request.status ===
                      "VERIFIED"
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
                      {request.instrument
                        ?.instrument_type ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Manufacturer
                    </span>

                    <strong>
                      {request.instrument
                        ?.manufacturer ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Model
                    </span>

                    <strong>
                      {request.instrument
                        ?.model ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Serial Number
                    </span>

                    <strong>
                      {request.instrument
                        ?.serial_number ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Capacity
                    </span>

                    <strong>
                      {request.instrument
                        ?.capacity ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="detail-row">
                    <span>
                      Location
                    </span>

                    <strong>
                      {request.instrument
                        ?.location ||
                        "N/A"}
                    </strong>
                  </div>
                </div>

                {request.status ===
                  "PENDING" && (
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
                    ✅ Inspection completed
                    successfully.
                  </div>
                )}

                {request.status ===
                  "REJECTED" && (
                  <div className="error-box">
                    ❌ This instrument was
                    rejected.
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