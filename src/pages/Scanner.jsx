/**
 * Scanner.jsx
 *
 * Budget Blossom
 * Smart Scanner Page
 */

import { useState } from "react";
import SmartScanController from "../components/common/scanner/SmartScanController";

export default function Scanner({
  onImportExpense,
  onImportCard,
  onImportIncome,
}) {
  const [scannerOpen, setScannerOpen] = useState(true);

  function handleClose() {
    setScannerOpen(false);

    // Return to the previous page after closing
    window.history.back();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingBottom: 90,
        boxSizing: "border-box",
        background: "var(--page-bg, #fff7fa)",
      }}
    >
      <div
        style={{
          maxWidth: 700,
          margin: "0 auto",
          padding: "32px 20px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: 30,
          }}
        >
          <div
            style={{
              fontSize: 54,
              marginBottom: 12,
            }}
          >
            📷
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            Smart Scanner
          </h1>

          <p
            style={{
              marginTop: 10,
              opacity: 0.65,
              lineHeight: 1.5,
            }}
          >
            Scan receipts, statements, credit cards,
            and income documents.
          </p>
        </div>

        <SmartScanController
          open={scannerOpen}
          onClose={handleClose}
          onImportExpense={onImportExpense}
          onImportCard={onImportCard}
          onImportIncome={onImportIncome}
        />
      </div>
    </div>
  );
}
