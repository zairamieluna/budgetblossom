/**
 * SmartScanController.jsx
 *
 * Budget Blossom
 *
 * Controls the complete Smart Scan workflow.
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
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleFileSelected(file) {
    try {
      setLoading(true);

      const result = await processDocument(file);

      setDocument(result);
      setReviewOpen(true);
    } catch (error) {
      console.error(error);
      alert("Unable to scan this document.");
    } finally {
      setLoading(false);
    }
  }

  function handleImport(reviewedDocument) {
    if (reviewedDocument.documentType === "receipt") {
      const expense =
        ImportService.receiptToExpense(reviewedDocument);

      onImportExpense?.(expense);
    }

    if (reviewedDocument.documentType === "credit-card") {
      const card =
        ImportService.receiptToCard(reviewedDocument);

      onImportCard?.(card);
    }

    setReviewOpen(false);
    setDocument(null);
    onClose?.();
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
        onCancel={() => {
          setReviewOpen(false);
          setDocument(null);
        }}
        onImport={handleImport}
      />

      {loading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
            color: "#fff",
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          Scanning document...
        </div>
      )}
    </>
  );
}
