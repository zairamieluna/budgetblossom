/**
 * Scanner.jsx
 *
 * Budget Blossom Smart Scanner
 * Phase 1
 */

import { useRef, useState } from "react";

import SoftCard from "../components/common/SoftCard";
import { colors, typography } from "../ui/designTokens";

export default function Scanner() {
  const fileInput = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);

  function chooseFile() {
    fileInput.current?.click();
  }

  function handleFile(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setSelectedFile(file);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        padding: 24,
        paddingBottom: 90,
      }}
    >
      <div
        style={{
          maxWidth: 540,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontFamily: typography.fontDisplay,
            marginBottom: 8,
          }}
        >
          📷 Smart Scanner
        </h1>

        <p
          style={{
            opacity: 0.75,
            marginBottom: 24,
          }}
        >
          Import receipts, screenshots, statements, PDFs and credit cards.
        </p>

        <SoftCard
          style={{
            textAlign: "center",
            padding: 40,
          }}
        >
          <div
            style={{
              fontSize: 54,
              marginBottom: 18,
            }}
          >
            📄
          </div>

          <h2>Select a document</h2>

          <p
            style={{
              opacity: 0.7,
              marginBottom: 24,
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
        </SoftCard>

        {selectedFile && (
          <SoftCard
            style={{
              marginTop: 20,
            }}
          >
            <h3>Selected File</h3>

            <p>{selectedFile.name}</p>

            <p>{Math.round(selectedFile.size / 1024)} KB</p>

            <p
              style={{
                color: "green",
                fontWeight: 600,
              }}
            >
              Ready for OCR
            </p>
          </SoftCard>
        )}
      </div>
    </div>
  );
}
