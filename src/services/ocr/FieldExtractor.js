/**
 * src/services/ocr/FieldExtractor.js
 *
 * Budget Blossom
 * Smart Scanner
 *
 * Converts OCR text into structured financial data.
 *
 * This file contains NO API calls.
 * It simply extracts fields from text.
 */

export class FieldExtractor {
  /**
   * Extract common financial fields from OCR text.
   *
   * @param {string} text
   * @returns {Object}
   */
  extract(text = "") {
    const source = text.replace(/\r/g, "");

    return {
      bank: this.extractBank(source),
      balance: this.extractMoney(source, [
        "current balance",
        "balance",
        "statement balance",
      ]),
      availableCredit: this.extractMoney(source, [
        "available credit",
        "available",
      ]),
      creditLimit: this.extractMoney(source, [
        "credit limit",
        "limit",
      ]),
      minimumPayment: this.extractMoney(source, [
        "minimum payment",
        "minimum due",
      ]),
      dueDate: this.extractDate(source),
      statementDate: this.extractStatementDate(source),
    };
  }

  // --------------------------------------------------

  extractBank(text) {
    const banks = [
      "CIBC",
      "RBC",
      "TD",
      "Scotiabank",
      "BMO",
      "PC Financial",
      "Simplii",
      "Tangerine",
      "American Express",
      "Amex",
    ];

    const upper = text.toUpperCase();

    const match = banks.find((bank) =>
      upper.includes(bank.toUpperCase())
    );

    return match || null;
  }

  // --------------------------------------------------

  extractMoney(text, labels = []) {
    const lines = text.split("\n");

    for (const line of lines) {
      for (const label of labels) {
        if (line.toLowerCase().includes(label.toLowerCase())) {
          const match = line.match(/\$?\s?([\d,]+\.\d{2})/);

          if (match) {
            return Number(match[1].replace(/,/g, ""));
          }
        }
      }
    }

    return null;
  }

  // --------------------------------------------------

  extractDate(text) {
    const match = text.match(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/i
    );

    return match ? match[0] : null;
  }

  // --------------------------------------------------

  extractStatementDate(text) {
    const lines = text.split("\n");

    for (const line of lines) {
      if (line.toLowerCase().includes("statement")) {
        const match = line.match(
          /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/i
        );

        if (match) {
          return match[0];
        }
      }
    }

    return null;
  }
}

const fieldExtractor = new FieldExtractor();

export default fieldExtractor;
