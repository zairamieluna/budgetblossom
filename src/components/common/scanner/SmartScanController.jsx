/**
 * SmartScanController.jsx
 *
 * Budget Blossom
 *
 * Controls the complete Smart Scan workflow.
 *
 * Supports:
 *   • Receipt → Expense
 *   • Credit Card → Card
 *   • Income / Pay Stub → Income
 */

import { useState } from "react";

import ScannerModal from "./ScannerModal";
import ReviewImportModal from "./ReviewImportModal";

import { processDocument } from "../../../services/ocr/OCRPipeline";
import ImportService from "../../../services/scanner/ImportService";

export default function SmartScanController({
  open,
  onClose,
  onImportExpense,
  onImportCard,
  onImportIncome,
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleFileSelected(file) {
    if (!file) return;

    try {
      setLoading(true);

      const result = await processDocument(file);

      console.log("Smart Scan result:", result);

      setDocument(result);
      setReviewOpen(true);
    } catch (error) {
      console.error("Smart Scan error:", error);

      alert(
        error?.message ||
        "Unable to scan this document."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleImport(reviewedDocument) {
    if (!reviewedDocument) return;

    console.log(
      "Importing document:",
      reviewedDocument
    );

    /*
     * RECEIPT → EXPENSE
     */
    if (
      reviewedDocument.documentType ===
      "receipt"
    ) {
      const expense =
        ImportService.receiptToExpense(
          reviewedDocument
        );

      console.log(
        "Imported expense:",
        expense
      );

      onImportExpense?.(expense);
    }

    /*
     * CREDIT CARD → CARD
     */
    else if (
      reviewedDocument.documentType ===
      "credit-card"
    ) {
      const card =
        ImportService.receiptToCard(
          reviewedDocument
        );

      console.log(
        "Imported card:",
        card
      );

      onImportCard?.(card);
    }

    /*
     * INCOME / PAY STUB → INCOME
     */
    else if (
      reviewedDocument.documentType ===
      "income"
    ) {
      const income =
        ImportService.incomeToIncome(
          reviewedDocument
        );

      console.log(
        "Imported income:",
        income
      );

      onImportIncome?.(income);
    }

    /*
     * UNKNOWN DOCUMENT
     */
    else {
      console.warn(
        "Unsupported document type:",
        reviewedDocument.documentType
      );

      alert(
        `This document was detected as "${reviewedDocument.documentType}". ` +
        "It cannot be imported yet."
      );

      return;
    }

    /*
     * Close review modal after successful import.
     */
    setReviewOpen(false);
    setDocument(null);

    onClose?.();
  }

  function handleCancelReview() {
    setReviewOpen(false);
    setDocument(null);
  }

  return (
    <>
      <ScannerModal
        open={open}
        onClose={onClose}
        onFileSelected={handleFileSelected}
      />

      <ReviewImportModal
        open={reviewOpen}
        document={document}
        onCancel={handleCancelReview}
        onImport={handleImport}
      />

      {loading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,.45)",
            backdropFilter:
              "blur(3px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
            color: "#fff",
            fontSize: 20,
            fontWeight: 700,
            textAlign: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              fontSize: 42,
              marginBottom: 14,
            }}
          >
            📄
          </div>

          <div>
            Scanning document...
          </div>

          <div
            style={{
              fontSize: 13,
              fontWeight: 400,
              opacity: 0.8,
              marginTop: 8,
            }}
          >
            Please wait.
          </div>
        </div>
      )}
    </>
  );
}
