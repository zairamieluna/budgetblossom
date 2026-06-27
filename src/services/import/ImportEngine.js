/**
 * ImportEngine.js
 *
 * Budget Blossom
 * Import Engine
 *
 * Converts OCR output into Budget Blossom data.
 */

export function importDocument(document) {
  switch (document.documentType) {

    case "credit-card":
      return importCreditCard(document);

    case "receipt":
      return importReceipt(document);

    case "statement":
      return importStatement(document);

    default:
      return {
        success: false,
        message: "Unknown document type."
      };
  }
}

function importCreditCard(document) {

  return {
    success: true,

    target: "cards",

    payload: {
      balance: document.fields.balance,

      creditLimit: document.fields.creditLimit,

      availableCredit: document.fields.availableCredit,

      minimumPayment: document.fields.minimumPayment,

      dueDate: document.fields.dueDate,
    },
  };
}

function importReceipt(document) {

  return {
    success: true,

    target: "expenses",

    payload: {
      merchant: document.fields.merchant,

      total: document.fields.total,

      tax: document.fields.tax,

      date: document.fields.date,
    },
  };
}

function importStatement(document) {

  return {
    success: true,

    target: "transactions",

    payload: document.fields.transactions,
  };
}
