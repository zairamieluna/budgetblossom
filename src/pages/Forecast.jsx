/**
 * Forecast.jsx
 * Financial Forecast (placeholder)
 */

export default function Forecast() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 16px 90px",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          maxWidth: "520px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            marginBottom: "8px",
          }}
        >
          📈 Forecast
        </h1>

        <p
          style={{
            opacity: 0.7,
            marginBottom: "24px",
          }}
        >
          Forecast module is being connected.
        </p>

        <div
          style={{
            padding: "20px",
            borderRadius: "16px",
            border: "1px solid var(--border)",
            background: "var(--card-bg)",
          }}
        >
          🚧 Forecast engine coming next.
        </div>
      </div>
    </div>
  );
}
