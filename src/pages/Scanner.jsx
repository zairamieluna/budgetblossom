/**
 * Scanner.jsx
 *
 * Budget Blossom
 *
 * Smart Scanner page.
 *
 * Supports:
 *   • Receipt → Expense
 *   • Credit Card → Card
 *   • Income / Pay Stub → Income
 */

import { useState } from "react";

import SoftCard from "../components/common/SoftCard";
import { colors, typography } from "../ui/designTokens";

import SmartScanController from "../components/common/scanner/SmartScanController";

export default function Scanner() {
  const [scannerOpen, setScannerOpen] = useState(false);

  function openScanner() {
    setScannerOpen(true);
  }

  function closeScanner() {
    setScannerOpen(false);
  }

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
        {/* HEADER */}
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
            opacity: 0.7,
            marginTop: 0,
            marginBottom: 24,
          }}
        >
          Scan your financial documents and automatically
          import the information into Budget Blossom.
        </p>

        {/* MAIN SCANNER CARD */}
        <SoftCard
          style={{
            padding: 32,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 56,
              marginBottom: 16,
            }}
          >
            📄
          </div>

          <h2
            style={{
              marginTop: 0,
              marginBottom: 8,
            }}
          >
            Smart Scan
          </h2>

          <p
            style={{
              opacity: 0.7,
              lineHeight: 1.5,
              marginBottom: 24,
            }}
          >
            Upload a receipt, credit card statement,
            pay stub, income document, screenshot or PDF.
          </p>

          <button
            type="button"
            onClick={openScanner}
            style={{
              width: "100%",
              padding: "14px 20px",
              border: "none",
              borderRadius: 14,
              background: colors.primary,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              position: "relative",
              zIndex: 2,
            }}
          >
            📷 Scan a Document
          </button>

          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              opacity: 0.6,
            }}
          >
            JPG, PNG or PDF
          </div>
        </SoftCard>

        {/* WHAT CAN BE SCANNED */}
        <SoftCard
          style={{
            marginTop: 16,
            padding: 20,
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: 14,
            }}
          >
            What can I scan?
          </h3>

          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            <div>
              🧾 <strong>Receipt</strong>
              <div
                style={{
                  marginLeft: 26,
                  fontSize: 13,
                  opacity: 0.65,
                }}
              >
                Automatically create an expense
              </div>
            </div>

            <div>
              💳 <strong>Credit Card</strong>
              <div
                style={{
                  marginLeft: 26,
                  fontSize: 13,
                  opacity: 0.65,
                }}
              >
                Detect and import card information
              </div>
            </div>

            <div>
              💰 <strong>Income / Pay Stub</strong>
              <div
                style={{
                  marginLeft: 26,
                  fontSize: 13,
                  opacity: 0.65,
                }}
              >
                Automatically create an income entry
              </div>
            </div>

            <div>
              🏦 <strong>Bank Statement</strong>
              <div
                style={{
                  marginLeft: 26,
                  fontSize: 13,
                  opacity: 0.65,
                }}
              >
                Detect financial information
              </div>
            </div>

            <div>
              📄 <strong>PDF / Screenshot</strong>
              <div
                style={{
                  marginLeft: 26,
                  fontSize: 13,
                  opacity: 0.65,
                }}
              >
                Process supported financial documents
              </div>
            </div>
          </div>
        </SoftCard>
      </div>

      {/* SMART SCAN CONTROLLER */}
      <SmartScanController
        open={scannerOpen}
        onClose={closeScanner}
        onImportExpense={(expense) => {
          console.log(
            "Smart Scanner → Expense:",
            expense
          );

          /*
           * Expense import callback.
           *
           * Keep this callback for the existing
           * expense workflow.
           */
        }}
        onImportCard={(card) => {
          console.log(
            "Smart Scanner → Credit Card:",
            card
          );

          /*
           * Credit card import callback.
           */
        }}
        onImportIncome={(income) => {
          console.log(
            "Smart Scanner → Income:",
            income
          );

          /*
           * IMPORTANT:
           * Income scanning is intentionally preserved.
           *
           * This receives the income/pay-stub data
           * generated by SmartScanController.
           */
        }}
      />
    </div>
  );
}
