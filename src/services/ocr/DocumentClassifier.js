/**
 * DocumentClassifier.js
 *
 * Budget Blossom
 * Smart Document Classifier
 */

const CREDIT_CARD_KEYWORDS = [
  "credit limit",
  "available credit",
  "minimum payment",
  "statement balance",
  "payment due",
  "mastercard",
  "visa",
  "american express",
];

const RECEIPT_KEYWORDS = [
  "hst",
  "subtotal",
  "total",
  "tax",
  "change",
];

const BANK_KEYWORDS = [
  "account",
  "deposit",
  "withdrawal",
  "balance",
  "available balance",
];

const STATEMENT_KEYWORDS = [
  "statement period",
  "transactions",
  "opening balance",
  "closing balance",
];

export function classifyDocument(text = "") {
  const lower = text.toLowerCase();

  if (
    CREDIT_CARD_KEYWORDS.some(keyword =>
      lower.includes(keyword)
    )
  ) {
    return "credit-card";
  }

  if (
    RECEIPT_KEYWORDS.some(keyword =>
      lower.includes(keyword)
    )
  ) {
    return "receipt";
  }

  if (
    STATEMENT_KEYWORDS.some(keyword =>
      lower.includes(keyword)
    )
  ) {
    return "statement";
  }

  if (
    BANK_KEYWORDS.some(keyword =>
      lower.includes(keyword)
    )
  ) {
    return "bank-account";
  }

  return "unknown";
}
