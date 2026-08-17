// src/services/ocr/FieldExtractor.js

function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractMoneyNearLabels(text, labels) {
  const normalized = normalizeText(text);

  for (const label of labels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(
      `${escapedLabel}\\s*[:\\-]?\\s*\\$?\\s*([0-9,]+(?:\\.\\d{2})?)`,
      "i"
    );

    const match = normalized.match(regex);

    if (match) {
      const value = Number(match[1].replace(/,/g, ""));

      if (Number.isFinite(value)) {
        return value;
      }
    }
  }

  return null;
}

function extractDateNearLabels(text, labels) {
  const normalized = normalizeText(text);

  for (const label of labels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(
      `${escapedLabel}\\s*[:\\-]?\\s*` +
        `(` +
        `\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}` +
        `|` +
        `[a-z]{3,9}\\s+\\d{1,2}(?:,\\s*|\\s+)\\d{4}` +
        `|` +
        `\\d{1,2}\\s+[a-z]{3,9}\\s+\\d{4}` +
        `)`,
      "i"
    );

    const match = normalized.match(regex);

    if (match) {
      return match[1];
    }
  }

  return null;
}

/*
 * -------------------------------------------------------
 * CREDIT CARD FIELD EXTRACTION
 * -------------------------------------------------------
 */

export function extractCreditCardFields(text) {
  const normalized = normalizeText(text);

  /*
   * -------------------------------------------------------
   * BALANCE
   * -------------------------------------------------------
   *
   * Different banks/cards use different labels:
   *
   * CIBC:
   *   Amount Due $2,032.49
   *
   * Other cards:
   *   Current balance $1,170.89
   *
   * Statements:
   *   Statement balance $1,441.49
   */

  const balance = extractMoneyNearLabels(normalized, [
    "amount due",
    "statement balance",
    "statement amount",
    "statement total",
    "current balance",
    "balance owing",
    "amount owing",
    "total balance",
    "balance due",
    "new balance",
  ]);

  /*
   * -------------------------------------------------------
   * CREDIT LIMIT
   * -------------------------------------------------------
   */

  const creditLimit = extractMoneyNearLabels(normalized, [
    "credit limit",
    "total credit limit",
    "authorized credit limit",
    "approved credit limit",
    "card limit",
  ]);

  /*
   * -------------------------------------------------------
   * AVAILABLE CREDIT
   * -------------------------------------------------------
   *
   * CIBC uses:
   *   Credit Available
   *
   * Other cards may use:
   *   Available Credit
   */

  const availableCredit = extractMoneyNearLabels(normalized, [
    "credit available",
    "available credit",
    "available amount",
    "remaining credit",
    "remaining available credit",
  ]);

  /*
   * -------------------------------------------------------
   * MINIMUM PAYMENT
   * -------------------------------------------------------
   */

  const minimumPayment = extractMoneyNearLabels(normalized, [
    "minimum payment",
    "minimum payment amount",
    "minimum amount due",
    "minimum due",
    "payment due amount",
  ]);

  /*
   * -------------------------------------------------------
   * DUE DATE
   * -------------------------------------------------------
   */

  const dueDate = extractDateNearLabels(normalized, [
    "minimum payment due",
    "payment due date",
    "payment due",
    "due date",
    "due on",
  ]);

  return {
    bank: null,
    cardName: null,
    balance,
    creditLimit,
    availableCredit,
    minimumPayment,
    dueDate,
  };
}

/*
 * -------------------------------------------------------
 * GENERIC OCR FIELD EXTRACTION
 * -------------------------------------------------------
 *
 * OCRPipeline.js imports this function:
 *
 * import { extractFields } from "./FieldExtractor";
 *
 * Keep this export so the OCR pipeline can call the
 * credit-card extractor without causing a build error.
 */

export function extractFields(text) {
  return extractCreditCardFields(text);
}
