/**
 * ValidationEngine.js
 *
 * Budget Blossom
 * OCR Validation Engine
 *
 * V2
 */

function isPositiveNumber(value) {
  return typeof value === "number" && !isNaN(value) && value >= 0;
}

export function validateExtractedData(documentType, fields) {
  const errors = [];
  const warnings = [];

  switch (documentType) {
    case "credit-card": {
      if (!isPositiveNumber(fields.balance)) {
        errors.push("Missing or invalid card balance.");
      }

      if (!isPositiveNumber(fields.creditLimit)) {
        warnings.push("Credit limit could not be detected.");
      }

      if (!isPositiveNumber(fields.availableCredit)) {
        warnings.push("Available credit was not detected.");
      }

      if (!isPositiveNumber(fields.minimumPayment)) {
        warnings.push("Minimum payment was not detected.");
      }

      if (!fields.dueDate) {
        warnings.push("Due date was not detected.");
      }

      break;
    }

    case "receipt": {
      if (!isPositiveNumber(fields.total)) {
        errors.push("Receipt total could not be detected.");
      }

      if (!fields.merchant) {
        warnings.push("Merchant name was not detected.");
      }

      break;
    }

    case "statement": {
      if (!isPositiveNumber(fields.openingBalance)) {
        warnings.push("Opening balance missing.");
      }

      if (!isPositiveNumber(fields.closingBalance)) {
        warnings.push("Closing balance missing.");
      }

      break;
    }

    default:
      warnings.push("Unknown document type.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
