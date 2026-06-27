/**
 * FieldExtractor.js
 *
 * Budget Blossom
 * Smart Field Extraction Engine
 *
 * V1
 */

function extractMoney(text, label) {
  const regex = new RegExp(
    `${label}[\\s:$]*([0-9,]+\\.?[0-9]*)`,
    "i"
  );

  const match = text.match(regex);

  if (!match) return null;

  return Number(
    match[1].replace(/,/g, "")
  );
}

function extractDate(text, label) {
  const regex = new RegExp(
    `${label}[\\s:]*([A-Za-z0-9 ,/-]+)`,
    "i"
  );

  const match = text.match(regex);

  return match ? match[1].trim() : null;
}

export function extractFields(documentType, text = "") {
  switch (documentType) {
    case "credit-card":
      return {
        bank: null,

        cardName: null,

        balance: extractMoney(
          text,
          "statement balance"
        ),

        creditLimit: extractMoney(
          text,
          "credit limit"
        ),

        availableCredit: extractMoney(
          text,
          "available credit"
        ),

        minimumPayment: extractMoney(
          text,
          "minimum payment"
        ),

        dueDate: extractDate(
          text,
          "payment due"
        ),
      };

    case "receipt":
      return {
        merchant: null,

        subtotal: extractMoney(
          text,
          "subtotal"
        ),

        tax: extractMoney(
          text,
          "tax"
        ),

        total: extractMoney(
          text,
          "total"
        ),

        date: extractDate(
          text,
          "date"
        ),
      };

    case "statement":
      return {
        openingBalance: extractMoney(
          text,
          "opening balance"
        ),

        closingBalance: extractMoney(
          text,
          "closing balance"
        ),

        transactions: [],
      };

    default:
      return {};
  }
}
