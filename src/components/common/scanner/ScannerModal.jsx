/**
 * ScannerModal.jsx
 *
 * Budget Blossom
 * Smart Scanner Modal
 *
 * Purpose:
 * - Select a receipt, screenshot, statement, PDF, or credit card document
 * - Send the selected file to the OCR pipeline
 */

import { useRef, useState } from "react";
import { colors, typography } from "../../../ui/designTokens";

export default function ScannerModal({
  open,
  onClose,
  onFileSelected,
}) {
  const fileInput = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  if (!open) return null;

  function chooseFile() {
    fileInput.current?.click();
  }

  function handleFile(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setSelectedFile(file);
  }

  function handleContinue() {
    if (!selectedFile) return;

    onFileSelected?.(selectedFile);
  }

  function handleClose() {
    setSelectedFile(null);

    if (fileInput.current) {
      fileInput.current.value = "";
    }

    onClose?.();
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={handleClose}
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
          transform: "translate(-50%, -50%)",
          width: "94%",
          maxWidth: 520,
          background: colors.bgCard,
          borderRadius: 24,
          padding: 24,
          maxHeight: "85vh",
          overflowY: "auto",
          zIndex: 901,
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: typography.fontDisplay,
            }}
          >
            📷 Smart Scanner
          </h2>

          <button
            onClick={handleClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "none",
              background: colors.bg,
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ✕
          </button>
        </div>

        <p
          style={{
            opacity: 0.7,
            marginTop: 8,
            marginBottom: 24,
          }}
        >
          Import receipts, screenshots, statements, PDFs and credit cards.
        </p>

        {/* Upload Area */}
        <div
          style={{
            border: `2px dashed ${colors.border}`,
            borderRadius: 20,
            padding: 32,
            textAlign: "center",
            background: colors.bg,
          }}
        >
          <div
            style={{
              fontSize: 52,
              marginBottom: 14,
            }}
          >
            📄
          </div>

          <h3
            style={{
              marginTop: 0,
              marginBottom: 8,
            }}
          >
            Select a document
          </h3>

          <p
            style={{
              opacity: 0.65,
              marginBottom: 20,
              fontSize: 14,
            }}
          >
            JPG, PNG or PDF
          </p>

          <button
            onClick={chooseFile}
            style={{
              padding: "12px 26px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              background: colors.primary,
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Choose File
          </button>

          <input
            ref={fileInput}
            type="file"
            accept="image/*,.pdf"
            hidden
            onChange={handleFile}
          />
        </div>

        {/* Selected File */}
        {selectedFile && (
          <div
            style={{
              marginTop: 18,
              padding: 16,
              borderRadius: 16,
              background: colors.bg,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Selected File
            </div>

            <div
              style={{
                fontSize: 14,
                wordBreak: "break-word",
              }}
            >
              {selectedFile.name}
            </div>

            <div
              style={{
                fontSize: 12,
                opacity: 0.6,
                marginTop: 4,
              }}
            >
              {Math.round(selectedFile.size / 1024)} KB
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#16803c",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              ✓ Ready for OCR
            </div>
          </div>
        )}

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 24,
          }}
        >
          <button
            onClick={handleClose}
            style={{
              flex: 1,
              padding: 14,
              border: "none",
              borderRadius: 14,
              cursor: "pointer",
              background: colors.bg,
              fontWeight: 700,
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleContinue}
            disabled={!selectedFile}
            style={{
              flex: 1,
              padding: 14,
              border: "none",
              borderRadius: 14,
              cursor: selectedFile
                ? "pointer"
                : "not-allowed",
              background: colors.primary,
              color: "#fff",
              fontWeight: 700,
              opacity: selectedFile ? 1 : 0.5,
            }}
          >
            Scan Document
          </button>
        </div>
      </div>
    </>
  );
}
