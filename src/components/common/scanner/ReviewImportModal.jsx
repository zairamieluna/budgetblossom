/**
 * ReviewImportModal.jsx
 *
 * Budget Blossom
 * Smart Import Review
 */

import { colors, typography } from "../../ui/designTokens";

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(value);
  }

  return value;
}

export default function ReviewImportModal({
  open,
  document,
  onCancel,
  onImport,
}) {
  if (!open || !document) return null;

  const fields = document.fields || {};

  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.45)",
          zIndex: 900,
        }}
      />

      <div
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
          width: "94%",
          maxWidth: 520,
          background: colors.bgCard,
          borderRadius: 24,
          padding: 24,
          zIndex: 901,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            fontFamily: typography.fontDisplay,
          }}
        >
          📄 Review Import
        </h2>

        <p
          style={{
            opacity: .7,
            marginBottom: 20,
          }}
        >
          Please review the detected information before importing.
        </p>

        <div
          style={{
            padding: 16,
            borderRadius: 16,
            background: colors.bg,
            marginBottom: 20,
          }}
        >
          <strong>Document Type</strong>

          <div style={{ marginTop: 6 }}>
            {document.documentType}
          </div>
        </div>

        {Object.entries(fields).map(([key, value]) => (
          <div
            key={key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <strong>
              {key}
            </strong>

            <span>
              {formatValue(value)}
            </span>
          </div>
        ))}

        {document.validation?.warnings?.length > 0 && (
          <div
            style={{
              marginTop: 24,
              padding: 16,
              background: "#FFF7E8",
              borderRadius: 16,
            }}
          >
            <strong>Warnings</strong>

            <ul>
              {document.validation.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {document.validation?.errors?.length > 0 && (
          <div
            style={{
              marginTop: 24,
              padding: 16,
              background: "#FFECEC",
              borderRadius: 16,
            }}
          >
            <strong>Errors</strong>

            <ul>
              {document.validation.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 28,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 14,
              border: "none",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            onClick={onImport}
            disabled={!document.validation?.valid}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 14,
              border: "none",
              cursor: "pointer",
              background: colors.pink,
              color: "#fff",
              fontWeight: 700,
              opacity: document.validation?.valid ? 1 : .5,
            }}
          >
            Import
          </button>
        </div>
      </div>
    </>
  );
}
