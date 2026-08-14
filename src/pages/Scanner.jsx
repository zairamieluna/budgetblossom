/**
 * Scanner.jsx
 *
 * Budget Blossom Smart Scanner
 *
 * Connects the Scanner page to the complete
 * SmartScanController workflow.
 */

import { useState } from "react";

import SoftCard from "../components/common/SoftCard";
import { colors, typography } from "../ui/designTokens";

import SmartScanController from "../components/scanner/SmartScanController";

export default function Scanner() {
  const [scannerOpen, setScannerOpen] = useState(true);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        padding: 24,
        paddingBottom: 100,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: 540,
          margin: "0 auto",
        }}
      >
        {/* Header */}
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
          Import receipts, screenshots, statements, income,
          pay stubs, PDFs and credit cards.
        </p>

        {/* Main scanner card */}
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

          <h2
            style={{
              marginBottom: 8,
            }}
          >
            Smart Scan
          </h2>

          <p
            style={{
              opacity: 0.7,
              marginBottom: 24,
              lineHeight: 1.5,
            }}
          >
            Upload a document and Budget Blossom will
            detect the information automatically.
          </p>

          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: 14,
              border: "none",
              cursor: "pointer",
              background: colors.primary,
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              position: "relative",
              zIndex: 2,
            }}
          >
            📷 Choose Document
          </button>

          <p
            style={{
              marginTop: 14,
              marginBottom: 0,
              fontSize: 12,
              opacity: 0.6,
            }}
          >
            JPG, PNG or PDF
          </p>
        </SoftCard>

        {/* Instructions */}
        <SoftCard
          style={{
            marginTop: 16,
            padding: 18,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            What can I scan?
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
              fontSize: 13,
              opacity: 0.75,
            }}
          >
            <div>🧾 Receipts → Expenses</div>
            <div>💰 Pay stubs → Income</div>
            <div>💳 Credit card statements → Cards</div>
            <div>🏦 Bank statements → Accounts</div>
            <div>📄 PDFs and screenshots</div>
          </div>
        </SoftCard>
      </div>

      {/* COMPLETE SMART SCAN CONTROLLER */}
      <SmartScanController
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onImportExpense={(expense) => {
          console.log("Scanner imported expense:", expense);
        }}
        onImportCard={(card) => {
          console.log("Scanner imported card:", card);
        }}
        onImportIncome={(income) => {
          console.log("Scanner imported income:", income);
        }}
      />
    </div>
  );
}
