/**
 * src/services/ocr/ValidationEngine.js
 *
 * Budget Blossom
 * Smart Scanner
 *
 * Validates extracted OCR data before it is saved.
 *
 * This prevents bad OCR reads from corrupting
 * the user's financial data.
 */

export class ValidationEngine {
  /**
   * Validate extracted document.
   *
   * @param {Object} data
   * @returns {{
   *   valid:boolean,
   *   errors:string[]
   * }}
   */
  validate(data = {}) {
    const errors = [];

    // ----------------------------------------
    // Balance
    // ----------------------------------------

    if (
      data.balance !== null &&
      data.balance !== undefined &&
      (isNaN(data.balance) || data.balance < 0)
    ) {
      errors.push("Balance must be a positive number.");
    }

    // ----------------------------------------
    // Credit Limit
    // ----------------------------------------

    if (
      data.creditLimit !== null &&
      data.creditLimit !== undefined &&
      (isNaN(data.creditLimit) || data.creditLimit < 0)
    ) {
      errors.push("Credit limit is invalid.");
    }

    // ----------------------------------------
    // Minimum Payment
    // ----------------------------------------

    if (
      data.minimumPayment !== null &&
      data.minimumPayment !== undefined &&
      (isNaN(data.minimumPayment) || data.minimumPayment < 0)
    ) {
      errors.push("Minimum payment is invalid.");
    }

    // ----------------------------------------
    // Available Credit
    // ----------------------------------------

    if (
      data.availableCredit !== null &&
      data.availableCredit !== undefined &&
      (isNaN(data.availableCredit) || data.availableCredit < 0)
    ) {
      errors.push("Available credit is invalid.");
    }

    // ----------------------------------------
    // Due Date
    // ----------------------------------------

    if (
      data.dueDate &&
      typeof data.dueDate !== "string"
    ) {
      errors.push("Due date is invalid.");
    }

    // ----------------------------------------
    // Statement Date
    // ----------------------------------------

    if (
      data.statementDate &&
      typeof data.statementDate !== "string"
    ) {
      errors.push("Statement date is invalid.");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

const validationEngine = new ValidationEngine();

export default validationEngine;
