/**
 * DocumentClassifier.js
 *
 * Budget Blossom
 * Smart Document Classifier
 *
 * Supports:
 *   • Credit card statements
 *   • Receipts
 *   • Income / pay stubs
 *   • Bank statements
 *   • General statements
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
  "credit card",
];

const INCOME_KEYWORDS = [
  "pay stub",
  "paystub",
  "pay statement",
  "earnings statement",
  "employee earnings",
  "employee pay",
  "gross pay",
  "net pay",
  "net earnings",
  "gross earnings",
  "regular earnings",
  "regular hours",
  "hourly rate",
  "pay period",
  "pay date",
  "payroll",
  "year to date",
  "ytd earnings",
  "total earnings",
  "take home pay",
  "take-home pay",
  "direct deposit",
  "employee name",
  "employer",
];

const RECEIPT_KEYWORDS = [
  "hst",
  "subtotal",
  "total",
  "tax",
  "change",
  "receipt",
  "thank you for shopping",
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

/**
 * Counts how many keywords appear in the document.
 */
function keywordScore(text, keywords) {
  return keywords.reduce(
    (score, keyword) =>
      text.includes(keyword) ? score + 1 : score,
    0
  );
}

/**
 * Classifies OCR text into a Budget Blossom document type.
 */
export function classifyDocument(text = "") {
  const lower = String(text).toLowerCase().trim();

  if (!lower) {
    return "unknown";
  }

  const creditCardScore = keywordScore(
    lower,
    CREDIT_CARD_KEYWORDS
  );

  const incomeScore = keywordScore(
    lower,
    INCOME_KEYWORDS
  );

  const receiptScore = keywordScore(
    lower,
    RECEIPT_KEYWORDS
  );

  const statementScore = keywordScore(
    lower,
    STATEMENT_KEYWORDS
  );

  const bankScore = keywordScore(
    lower,
    BANK_KEYWORDS
  );

  /*
   * Credit cards get checked first because credit-card
   * statements can also contain words such as:
   * "payment", "balance", and "transactions".
   */
  if (creditCardScore >= 2) {
    return "credit-card";
  }

  /*
   * Income/pay-stub documents.
   *
   * Require at least 2 matching income keywords so that
   * a random document containing "pay" or "employer"
   * doesn't automatically become income.
   */
  if (incomeScore >= 2) {
    return "income";
  }

  /*
   * Receipts generally contain subtotal/tax/total/change.
   */
  if (receiptScore >= 2) {
    return "receipt";
  }

  if (statementScore >= 2) {
    return "statement";
  }

  if (bankScore >= 2) {
    return "bank-account";
  }

  /*
   * A single strong income indicator can still identify
   * some very simple pay stubs.
   */
  if (
    lower.includes("gross pay") ||
    lower.includes("net pay") ||
    lower.includes("pay stub") ||
    lower.includes("paystub")
  ) {
    return "income";
  }

  return "unknown";
}
