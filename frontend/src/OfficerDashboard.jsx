import { useEffect, useState } from "react";

const BACKEND_URL = "http://192.168.29.48:8000";

function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "20px",
        padding: "12px 0",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <span style={{ color: "#6b7280" }}>{label}</span>
      <strong>{value ?? "N/A"}</strong>
    </div>
  );
}

export default function OfficerDashboard({ token, user, logout }) {
  const [data, setData] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${BACKEND_URL}/officer/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || "Failed to load officer dashboard"
        );
      }

      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openCase = async (requestId) => {
    try {
      setDetailLoading(true);
      setError("");

      const response = await fetch(
        `${BACKEND_URL}/officer/cases/${requestId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || "Failed to load case"
        );
      }

      setSelectedCase(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="app">
        <main className="container">
          <div className="loading-box">
            Loading Officer Dashboard...
          </div>
        </main>
      </div>
    );
  }

  if (selectedCase) {
    const c = selectedCase;
    const inspection = c.inspection;
    const location = inspection?.location;

    return (
      <div className="app">
        <header className="navbar">
          <div className="logo">
            TRUE<span>WEIGHT</span>
          </div>

          <div className="nav-status">
            Officer Dashboard
          </div>

          <button
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>
        </header>

        <main className="container">

          <button
            className="secondary-button"
            onClick={() => setSelectedCase(null)}
            style={{ marginBottom: "20px" }}
          >
            ← Back to Cases
          </button>

          <section className="hero">
            <div className="badge">
              🛡️ OFFICER
            </div>

            <h1>
              Complete Verification Case
            </h1>

            <p>
              Full audit information for this
              verification request.
            </p>
          </section>

          {error && (
            <div className="error-box">
              ❌ {error}
            </div>
          )}

          {/* REQUEST */}
          <section className="verify-card">
            <h2>📋 Verification Request</h2>

            <div className="details">
              <InfoRow
                label="Request ID"
                value={c.verification_request?.id}
              />

              <InfoRow
                label="Application ID"
                value={c.verification_request?.application_id}
              />

              <InfoRow
                label="Status"
                value={c.verification_request?.status}
              />

              <InfoRow
                label="Requested At"
                value={
                  c.verification_request?.requested_at
                    ? new Date(
                        c.verification_request.requested_at
                      ).toLocaleString()
                    : "N/A"
                }
              />
            </div>
          </section>

          {/* MERCHANT */}
          <section className="verify-card">
            <h2>👤 Merchant Information</h2>

            <div className="details">
              <InfoRow
                label="Merchant ID"
                value={c.merchant?.id}
              />

              <InfoRow
                label="Name"
                value={c.merchant?.name}
              />

              <InfoRow
                label="Email"
                value={c.merchant?.email}
              />
            </div>
          </section>

          {/* INSTRUMENT */}
          <section className="verify-card">
            <h2>⚖️ Instrument Information</h2>

            <div className="details">
              <InfoRow
                label="Unique ID"
                value={c.instrument?.unique_id}
              />

              <InfoRow
                label="Instrument Type"
                value={c.instrument?.instrument_type}
              />

              <InfoRow
                label="Manufacturer"
                value={c.instrument?.manufacturer}
              />

              <InfoRow
                label="Model"
                value={c.instrument?.model}
              />

              <InfoRow
                label="Serial Number"
                value={c.instrument?.serial_number}
              />

              <InfoRow
                label="Capacity"
                value={c.instrument?.capacity}
              />

              <InfoRow
                label="Registered Location"
                value={c.instrument?.location}
              />
            </div>
          </section>

          {/* INSPECTOR */}
          <section className="verify-card">
            <h2>👨‍🔧 Inspector Information</h2>

            <div className="details">
              <InfoRow
                label="Inspector ID"
                value={c.inspector?.id}
              />

              <InfoRow
                label="Name"
                value={c.inspector?.name}
              />

              <InfoRow
                label="Email"
                value={c.inspector?.email}
              />
            </div>
          </section>

          {/* INSPECTION */}
          <section className="verify-card">
            <h2>🔬 Inspection Result</h2>

            {!inspection ? (
              <div className="loading-box">
                Inspection not completed yet.
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "12px",
                    marginBottom: "20px",
                    background:
                      inspection.result === "PASS"
                        ? "#ecfdf5"
                        : "#fef2f2",
                    border:
                      inspection.result === "PASS"
                        ? "1px solid #10b981"
                        : "1px solid #ef4444",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      color:
                        inspection.result === "PASS"
                          ? "#047857"
                          : "#b91c1c",
                    }}
                  >
                    {inspection.result === "PASS"
                      ? "✅ PASS"
                      : "❌ FAIL"}
                  </h2>
                </div>

                <div className="details">
                  <InfoRow
                    label="Standard Weight"
                    value={`${inspection.standard_weight} kg`}
                  />

                  <InfoRow
                    label="Machine Reading"
                    value={`${inspection.machine_reading} kg`}
                  />

                  <InfoRow
                    label="Calculated Error"
                    value={`${inspection.calculated_error} kg`}
                  />

                  <InfoRow
                    label="Permissible Error"
                    value={`${inspection.permissible_error} kg`}
                  />

                  <InfoRow
                    label="Remarks"
                    value={inspection.remarks}
                  />

                  <InfoRow
                    label="Inspected At"
                    value={
                      inspection.inspected_at
                        ? new Date(
                            inspection.inspected_at
                          ).toLocaleString()
                        : "N/A"
                    }
                  />
                </div>
              </>
            )}
          </section>

          {/* GPS */}
          <section className="verify-card">
            <h2>📍 Physical Inspection Location</h2>

            {!location?.latitude ||
            !location?.longitude ? (
              <div className="loading-box">
                ⚠️ GPS location was not recorded.
              </div>
            ) : (
              <>
                <div className="details">
                  <InfoRow
                    label="Latitude"
                    value={location.latitude}
                  />

                  <InfoRow
                    label="Longitude"
                    value={location.longitude}
                  />

                  <InfoRow
                    label="Altitude"
                    value={
                      location.altitude !== null
                        ? `${location.altitude} m`
                        : "N/A"
                    }
                  />

                  <InfoRow
                    label="GPS Accuracy"
                    value={
                      location.accuracy !== null
                        ? `${location.accuracy} m`
                        : "N/A"
                    }
                  />

                  <InfoRow
                    label="GPS Timestamp"
                    value={
                      location.timestamp
                        ? new Date(
                            location.timestamp
                          ).toLocaleString()
                        : "N/A"
                    }
                  />
                </div>

                <div
                  style={{
                    marginTop: "20px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid #ddd",
                  }}
                >
                  <iframe
                    title="Inspection Location"
                    width="100%"
                    height="350"
                    style={{ border: 0 }}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                      Number(location.longitude) - 0.005
                    }%2C${
                      Number(location.latitude) - 0.005
                    }%2C${
                      Number(location.longitude) + 0.005
                    }%2C${
                      Number(location.latitude) + 0.005
                    }&layer=mapnik&marker=${
                      location.latitude
                    }%2C${location.longitude}`}
                  />
                </div>

                <a
                  href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="login-button"
                  style={{
                    display: "inline-block",
                    marginTop: "15px",
                    textDecoration: "none",
                  }}
                >
                  🗺️ Open Exact Location
                </a>
              </>
            )}
          </section>

          {/* EVIDENCE */}
          <section className="verify-card">
            <h2>📷 Physical Evidence</h2>

            {c.evidence?.length === 0 ? (
              <div className="loading-box">
                No evidence uploaded.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "12px",
                }}
              >
                {c.evidence.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "16px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "10px",
                      background: "#fafafa",
                    }}
                  >
                    <strong>
                      {item.type}
                    </strong>

                    <div
                      style={{
                        marginTop: "6px",
                        color: "#6b7280",
                      }}
                    >
                      File: {item.file_name}
                    </div>

                    <div
                      style={{
                        color: "#6b7280",
                      }}
                    >
                      Uploaded:{" "}
                      {item.uploaded_at
                        ? new Date(
                            item.uploaded_at
                          ).toLocaleString()
                        : "N/A"}
                    </div>

                    <div
                      style={{
                        color: "#6b7280",
                      }}
                    >
                      Content: {item.content_type || "N/A"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* CERTIFICATE */}
          <section className="verify-card">
            <h2>📜 Certificate</h2>

            {!c.certificate ? (
              <div className="loading-box">
                Certificate not generated.
              </div>
            ) : (
              <div className="details">
                <InfoRow
                  label="Certificate Number"
                  value={
                    c.certificate.certificate_number
                  }
                />

                <InfoRow
                  label="Issued At"
                  value={
                    c.certificate.issued_at
                      ? new Date(
                          c.certificate.issued_at
                        ).toLocaleString()
                      : "N/A"
                  }
                />

                <InfoRow
                  label="Valid Until"
                  value={
                    c.certificate.valid_until || "N/A"
                  }
                />
              </div>
            )}
          </section>

          <button
            className="login-button"
            onClick={() => setSelectedCase(null)}
          >
            ← Back to All Cases
          </button>

        </main>

        <footer>
          © 2026 TrueWeight Verification Platform
        </footer>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="navbar">
        <div className="logo">
          TRUE<span>WEIGHT</span>
        </div>

        <div className="nav-status">
          Officer Dashboard
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
            🛡️ OFFICER
          </div>

          <h1>
            TrueWeight Officer Dashboard
          </h1>

          <p>
            Central verification monitoring and
            audit dashboard.
          </p>
        </section>

        {error && (
          <div className="error-box">
            ❌ {error}
          </div>
        )}

        {/* STATS */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: "15px",
            marginBottom: "25px",
          }}
        >
          {[
            ["Total Cases", data?.total || 0],
            ["Pending", data?.pending || 0],
            ["Verified", data?.verified || 0],
            ["Rejected", data?.rejected || 0],
          ].map(([title, value]) => (
            <div
              className="verify-card"
              key={title}
              style={{ margin: 0 }}
            >
              <p style={{ color: "#6b7280" }}>
                {title}
              </p>

              <h2 style={{ fontSize: "32px" }}>
                {value}
              </h2>
            </div>
          ))}
        </section>

        <button
          className="login-button"
          onClick={loadDashboard}
          style={{ marginBottom: "25px" }}
        >
          🔄 Refresh Cases
        </button>

        {/* CASES */}
        <section className="verify-card">
          <h2>📁 All Verification Cases</h2>

          {data?.cases?.length === 0 ? (
            <div className="loading-box">
              No verification cases available.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "15px",
              }}
            >
              {data?.cases?.map((item) => (
                <div
                  key={item.request_id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "14px",
                    padding: "20px",
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "15px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h3>
                        {item.application_id}
                      </h3>

                      <p>
                        Instrument:{" "}
                        {item.instrument
                          ?.instrument_type ||
                          "N/A"}
                      </p>

                      <p>
                        Serial:{" "}
                        {item.instrument
                          ?.serial_number ||
                          "N/A"}
                      </p>

                      <p>
                        Merchant:{" "}
                        {item.merchant?.name ||
                          "N/A"}
                      </p>
                    </div>

                    <div>
                      <strong>
                        {item.status}
                      </strong>

                      <p>
                        Evidence:{" "}
                        {item.evidence_count}
                      </p>

                      {item.inspection
                        ?.location
                        ?.latitude && (
                        <p>
                          📍 GPS Available
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    className="login-button"
                    onClick={() =>
                      openCase(item.request_id)
                    }
                    disabled={detailLoading}
                    style={{
                      marginTop: "15px",
                    }}
                  >
                    🔍 View Complete Case
                  </button>
                </div>
              ))}
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