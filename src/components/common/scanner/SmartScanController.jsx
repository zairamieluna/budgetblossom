/**
 * SmartScanController.jsx
 *
 * Budget Blossom
 * Smart Scanner Controller
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

      console.log("Starting OCR:", file.name);

      const result = await processDocument(file);

      console.log("OCR RESULT:", result);

      setDocument(result);

      onClose?.();

      setReviewOpen(true);
    } catch (error) {
      console.error("SMART SCAN ERROR:", error);

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

    try {
      if (reviewedDocument.documentType === "receipt") {
        const expense =
          ImportService.receiptToExpense(
            reviewedDocument
          );

        onImportExpense?.(expense);
      }

      else if (
        reviewedDocument.documentType === "credit-card"
      ) {
        const card =
          ImportService.receiptToCard(
            reviewedDocument
          );

        onImportCard?.(card);
      }

      else if (
        reviewedDocument.documentType === "income"
      ) {
        const income =
          ImportService.incomeToIncome(
            reviewedDocument
          );

        onImportIncome?.(income);
      }

      else {
        alert(
          `This document was detected as "${reviewedDocument.documentType}".`
        );

        return;
      }

      setReviewOpen(false);
      setDocument(null);

    } catch (error) {
      console.error(
        "IMPORT ERROR:",
        error
      );

      alert(
        error?.message ||
          "Unable to import this document."
      );
    }
  }

  function handleCancelReview() {
    setReviewOpen(false);
    setDocument(null);
  }

  return (
    <>
      <ScannerModal
        open={Boolean(open) && !reviewOpen}
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
            background: "rgba(0,0,0,.45)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            color: "#fff",
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          <div style={{ fontSize: 42 }}>
            📄
          </div>

          <div>
            Scanning document...
          </div>

          <div
            style={{
              fontSize: 13,
              fontWeight: 400,
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
