/**
 * ScannerModal.jsx
 *
 * Budget Blossom
 * Smart Scanner
 */

import FilePicker from "./FilePicker";
import { colors, typography } from "../../ui/designTokens";

export default function ScannerModal({
  open,
  onClose,
  onFileSelected,
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
          backdropFilter: "blur(4px)",
          zIndex: 800,
        }}
      />

      {/* Modal */}

      <div
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
          width: "92%",
          maxWidth: 420,
          background: colors.bgCard,
          borderRadius: 24,
          padding: 24,
          zIndex: 801,
          boxShadow: "0 25px 60px rgba(0,0,0,.25)",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: 6,
            fontFamily: typography.fontDisplay,
          }}
        >
          📷 Smart Scan
        </h2>

        <p
          style={{
            opacity: .7,
            marginBottom: 24,
          }}
        >
          Upload a receipt, screenshot,
          credit card statement or PDF.
        </p>

        <FilePicker
          onFileSelected={(file) => {
            onFileSelected(file);
          }}
        />

        <button
          onClick={onClose}
          style={{
            width: "100%",
            marginTop: 18,
            padding: 14,
            border: "none",
            borderRadius: 14,
            cursor: "pointer",
            background: colors.pink,
            color: "#fff",
            fontWeight: 700,
          }}
        >
          Cancel
        </button>
      </div>
    </>
  );
}
