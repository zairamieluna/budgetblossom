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
 *   • PDF / Screenshot documents
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

  function handleExpenseImport(expense) {
    console.log("Smart Scanner → Expense:", expense);

    /*
     * The SmartScanController has already converted
     * the scanned receipt into an expense object.
     *
     * Keep this callback available for the existing
     * expense import workflow.
     */
  }

  function handleCardImport(card) {
    console.log("Smart Scanner → Credit Card:", card);

    /*
     * The SmartScanController has converted the
     * scanned credit card document into a card object.
     */
  }

  function handleIncomeImport(income) {
    console.log("Smart Scanner → Income:", income);

    /*
     * IMPORTANT:
     * Income / Pay Stub scanning is intentionally
     * preserved.
     *
     * The SmartScanController sends the generated
     * income object here.
     */
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
          width: "100%",
          maxWidth: 540,
          margin: "0 auto",
        }}
      >
        {/* =========================================
            HEADER
        ========================================= */}

        <h1
          style={{
            marginTop: 0,
            marginBottom: 8,
            fontFamily: typography.fontDisplay,
          }}
        >
          📷 Smart Scanner
        </h1>

        <p
          style={{
            marginTop: 0,
            marginBottom: 24,
            opacity: 0.7,
            lineHeight: 1.5,
          }}
        >
          Scan your financial documents and automatically
          import the information into Budget Blossom.
        </p>

        {/* =========================================
            MAIN SCANNER CARD
        ========================================= */}

        <SoftCard
          style={{
            padding: 32,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 56,
              lineHeight: 1,
              marginBottom: 18,
            }}
          >
            📄
          </div>

          <h2
            style={{
              marginTop: 0,
              marginBottom: 10,
            }}
          >
            Smart Scan
          </h2>

          <p
            style={{
              marginTop: 0,
              marginBottom: 24,
              opacity: 0.7,
              lineHeight: 1.5,
            }}
          >
            Upload a receipt, credit card statement,
            pay stub, income document, screenshot,
            or PDF.
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

        {/* =========================================
            WHAT CAN BE SCANNED
        ========================================= */}

        <SoftCard
          style={{
            marginTop: 16,
            padding: 20,
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: 16,
            }}
          >
            What can I scan?
          </h3>

          {/* RECEIPTS */}

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 24,
              }}
            >
              🧾
            </div>

            <div>
              <strong>Receipt</strong>

              <div
                style={{
                  marginTop: 3,
                  fontSize: 13,
                  opacity: 0.65,
                }}
              >
                Automatically create an expense
              </div>
            </div>
          </div>

          {/* CREDIT CARD */}

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 24,
              }}
            >
              💳
            </div>

            <div>
              <strong>Credit Card</strong>

              <div
                style={{
                  marginTop: 3,
                  fontSize: 13,
                  opacity: 0.65,
                }}
              >
                Detect and import card information
              </div>
            </div>
          </div>

          {/* INCOME */}

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 24,
              }}
            >
              💰
            </div>

            <div>
              <strong>Income / Pay Stub</strong>

              <div
                style={{
                  marginTop: 3,
                  fontSize: 13,
                  opacity: 0.65,
                }}
              >
                Automatically create an income entry
              </div>
            </div>
          </div>

          {/* BANK STATEMENT */}

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 24,
              }}
            >
              🏦
            </div>

            <div>
              <strong>Bank Statement</strong>

              <div
                style={{
                  marginTop: 3,
                  fontSize: 13,
                  opacity: 0.65,
                }}
              >
                Detect financial information
              </div>
            </div>
          </div>

          {/* PDF */}

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 24,
              }}
            >
              📄
            </div>

            <div>
              <strong>PDF / Screenshot</strong>

              <div
                style={{
                  marginTop: 3,
                  fontSize: 13,
                  opacity: 0.65,
                }}
              >
                Process supported financial documents
              </div>
            </div>
          </div>
        </SoftCard>

        {/* =========================================
            HOW IT WORKS
        ========================================= */}

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
            How it works
          </h3>

          <div
            style={{
              display: "grid",
              gap: 12,
              fontSize: 13,
            }}
          >
            <div>
              <strong>1. Upload</strong>

              <div
                style={{
                  marginTop: 3,
                  opacity: 0.65,
                }}
              >
                Choose your receipt, statement,
                pay stub, or document.
              </div>
            </div>

            <div>
              <strong>2. Scan</strong>

              <div
                style={{
                  marginTop: 3,
                  opacity: 0.65,
                }}
              >
                Budget Blossom analyzes the document.
              </div>
            </div>

            <div>
              <strong>3. Review</strong>

              <div
                style={{
                  marginTop: 3,
                  opacity: 0.65,
                }}
              >
                Check and edit the detected information.
              </div>
            </div>

            <div>
              <strong>4. Import</strong>

              <div
                style={{
                  marginTop: 3,
                  opacity: 0.65,
                }}
              >
                Add the information to your Budget Blossom
                records.
              </div>
            </div>
          </div>
        </SoftCard>
      </div>

      {/* =========================================
          SMART SCAN CONTROLLER
      ========================================= */}

      <SmartScanController
        open={scannerOpen}
        onClose={closeScanner}
        onImportExpense={handleExpenseImport}
        onImportCard={handleCardImport}
        onImportIncome={handleIncomeImport}
      />
    </div>
  );
}
