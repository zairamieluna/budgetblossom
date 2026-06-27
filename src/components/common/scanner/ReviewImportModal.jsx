/**
 * ReviewImportModal.jsx
 *
 * Budget Blossom
 * Smart Import Review
 *
 * Version 2
 * - Editable fields
 * - User can correct OCR mistakes
 * - Returns edited values on import
 */

import { useEffect, useState } from "react";
import { colors, typography } from "../../ui/designTokens";

export default function ReviewImportModal({
  open,
  document,
  onCancel,
  onImport,
}) {
  const [fields, setFields] = useState({});

  useEffect(() => {
    if (document?.fields) {
      setFields(document.fields);
    }
  }, [document]);

  if (!open || !document) return null;

  function handleChange(key, value) {
    setFields((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleSave() {
    onImport?.({
      ...document,
      fields,
    });
  }

  return (
    <>
      {/* Overlay */}

      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.45)",
          backdropFilter: "blur(4px)",
          zIndex: 900,
        }}
      />

      {/* Modal */}

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
          maxHeight: "85vh",
          overflowY: "auto",
          zIndex: 901,
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
            opacity: 0.7,
            marginBottom: 24,
          }}
        >
          Review and edit the detected information before saving.
        </p>

        <div
          style={{
            marginBottom: 24,
            padding: 16,
            background: colors.bg,
            borderRadius: 16,
          }}
        >
          <strong>Document Type</strong>

          <div style={{ marginTop: 8 }}>
            {document.documentType}
          </div>
        </div>

        {Object.entries(fields).map(([key, value]) => (
          <div
            key={key}
            style={{
              marginBottom: 18,
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              {formatLabel(key)}
            </label>

            <input
              value={value ?? ""}
              onChange={(e) =>
                handleChange(key, e.target.value)
              }
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                background: colors.bg,
                fontSize: 15,
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}

        {document.validation?.warnings?.length > 0 && (
          <div
            style={{
              marginTop: 12,
              padding: 16,
              background: "#FFF7E8",
              borderRadius: 16,
            }}
          >
            <strong>Warnings</strong>

            <ul>
              {document.validation.warnings.map((warning) => (
                <li key={warning}>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {document.validation?.errors?.length > 0 && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              background: "#FFECEC",
              borderRadius: 16,
            }}
          >
            <strong>Errors</strong>

            <ul>
              {document.validation.errors.map((error) => (
                <li key={error}>
                  {error}
                </li>
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
              border: "none",
              borderRadius: 14,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: 14,
              border: "none",
              borderRadius: 14,
              cursor: "pointer",
              background: colors.pink,
              color: "#fff",
              fontWeight: 700,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}

function formatLabel(text) {
  return text
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}
