/**
 * src/services/ocr/DocumentClassifier.js
 *
 * Budget Blossom
 * Smart Scanner
 *
 * Determines what kind of document the user uploaded.
 *
 * This file NEVER performs OCR.
 * It only classifies the document based on
 * filename, MIME type and extracted text.
 */

export const DOCUMENT_TYPES = {
  RECEIPT: "receipt",
  CREDIT_CARD: "credit_card",
  BANK_STATEMENT: "bank_statement",
  PAYSTUB: "paystub",
  BANK_ACCOUNT: "bank_account",
  PDF: "pdf",
  IMAGE: "image",
  UNKNOWN: "unknown",
};

export class DocumentClassifier {
  classify(file, extractedText = "") {
    if (!file) {
      return DOCUMENT_TYPES.UNKNOWN;
    }

    const name = (file.name || "").toLowerCase();
    const type = (file.type || "").toLowerCase();
    const text = extractedText.toLowerCase();

    // --------------------------------------------------
    // PDF
    // --------------------------------------------------

    if (type.includes("pdf")) {
      return DOCUMENT_TYPES.PDF;
    }

    // --------------------------------------------------
    // Receipt
    // --------------------------------------------------

    if (
      text.includes("hst") ||
      text.includes("subtotal") ||
      text.includes("total") ||
      text.includes("tax")
    ) {
      return DOCUMENT_TYPES.RECEIPT;
    }

    // --------------------------------------------------
    // Credit Card
    // --------------------------------------------------

    if (
      text.includes("credit limit") ||
      text.includes("minimum payment") ||
      text.includes("statement balance") ||
      text.includes("available credit")
    ) {
      return DOCUMENT_TYPES.CREDIT_CARD;
    }

    // --------------------------------------------------
    // Bank Statement
    // --------------------------------------------------

    if (
      text.includes("transactions") ||
      text.includes("withdrawal") ||
      text.includes("deposit") ||
      text.includes("statement period")
    ) {
      return DOCUMENT_TYPES.BANK_STATEMENT;
    }

    // --------------------------------------------------
    // Paystub
    // --------------------------------------------------

    if (
      text.includes("gross pay") ||
      text.includes("net pay") ||
      text.includes("hours worked") ||
      text.includes("pay period")
    ) {
      return DOCUMENT_TYPES.PAYSTUB;
    }

    // --------------------------------------------------
    // Generic Images
    // --------------------------------------------------

    if (type.startsWith("image/")) {
      return DOCUMENT_TYPES.IMAGE;
    }

    return DOCUMENT_TYPES.UNKNOWN;
  }
}

const documentClassifier = new DocumentClassifier();

export default documentClassifier;
