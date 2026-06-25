/**
 * ScannerModal.jsx
 *
 * Budget Blossom
 * Smart Scan Modal
 */

import { colors, typography } from "../../ui/designTokens";

export default function ScannerModal({
  open,
  onClose,
  onSelectFile,
}) {
  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.45)",
          zIndex: 800,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: 380,
          background: colors.bgCard,
          borderRadius: 24,
          padding: 24,
          zIndex: 801,
          boxShadow: "0 18px 50px rgba(0,0,0,.22)",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            fontFamily: typography.fontDisplay,
          }}
        >
          📷 Smart Scan
        </h2>

        <p
          style={{
            opacity: 0.7,
            marginBottom: 24,
          }}
        >
          Choose what you want to import.
        </p>

        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (file) {
              onSelectFile?.(file);
            }
          }}
          style={{
            width: "100%",
            marginBottom: 18,
          }}
        />

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: 14,
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            background: colors.pink,
            color: "#fff",
            fontWeight: 700,
          }}
        >
          Close
        </button>
      </div>
    </>
  );
}