/**
 * Scanner.jsx
 *
 * Budget Blossom Smart Scanner
 *
 * Flow:
 * Choose File
 *      ↓
 * SmartScanController
 *      ↓
 * OCR Pipeline
 *      ↓
 * Document Classification
 *      ↓
 * Review Import
 *      ↓
 * Expense / Income / Card
 */

import { useState } from "react";

import SoftCard from "../components/common/SoftCard";
import { colors, typography } from "../ui/designTokens";

import SmartScanController from "../components/scanner/SmartScanController";

export default function Scanner() {
  const [scannerOpen, setScannerOpen] = useState(false);

  /*
   * These callbacks are intentionally kept here for now.
   *
   * The actual persistence connection will be added once
   * we connect Smart Scan to your Supabase expense/income data.
   */

  function handleImportExpense(expense) {
    console.log("Smart Scan Expense:", expense);

    alert(
      `Expense detected: ${expense.title}\n` +
      `Amount: $${Number(expense.amount || 0).toFixed(2)}`
    );
  }

  function handleImportCard(card) {
    console.log("Smart Scan Card:", card);

    alert(
      `Credit card statement detected.\n` +
      `Balance: $${Number(card.balance || 0).toFixed(2)}`
    );
  }

  function handleImportIncome(income) {
    console.log("Smart Scan Income:", income);

    alert(
      `Income detected: ${income.src}\n` +
      `Amount: $${Number(income.amt || 0).toFixed(2)}`
    );
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
          Import receipts, screenshots, pay stubs,
          statements, PDFs and credit cards.
        </p>

        {/* Scanner Card */}
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
              fontFamily: typography.fontDisplay,
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
            Upload a receipt, screenshot,
            pay stub, credit card statement
            or PDF and Budget Blossom will
            detect the information for you.
          </p>

          <button
            onClick={() => setScannerOpen(true)}
            style={{
              padding: "13px 28px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              background: colors.primary,
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            📷 Choose File
          </button>
        </SoftCard>

        {/* What can be scanned */}
        <SoftCard
          style={{
            marginTop: 20,
            padding: 20,
          }}
        >
          <h3
            style={{
              fontFamily: typography.fontDisplay,
              marginTop: 0,
              marginBottom: 14,
            }}
          >
            What can I scan?
          </h3>

          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            <ScanType
              emoji="🧾"
              title="Receipts"
              description="Import purchases into Expenses."
            />

            <ScanType
              emoji="💰"
              title="Pay Stubs"
              description="Import net income into your Budget Pool."
            />

            <ScanType
              emoji="💳"
              title="Credit Card Statements"
              description="Update your card balance and payment information."
            />

            <ScanType
              emoji="📄"
              title="PDFs & Screenshots"
              description="Upload supported documents for OCR."
            />
          </div>
        </SoftCard>
      </div>

      {/* Actual Smart Scan Controller */}
      <SmartScanController
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onImportExpense={handleImportExpense}
        onImportCard={handleImportCard}
        onImportIncome={handleImportIncome}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Scan Type
───────────────────────────────────────────── */

function ScanType({
  emoji,
  title,
  description,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 12,
        background: colors.bg,
        borderRadius: 12,
      }}
    >
      <div
        style={{
          fontSize: 25,
          width: 38,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        {emoji}
      </div>

      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 2,
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: 12,
            opacity: 0.65,
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}
