/**
 * FieldExtractor.js
 *
 * Budget Blossom
 * Smart Field Extraction Engine
 *
 * V3
 *
 * Supports:
 *   • Credit card
 *   • Receipt
 *   • Income / pay stub
 *   • Statement
 *   • Bank account
 *
 * IMPORTANT:
 * OCR text is not always returned in the same visual order
 * as the document. Therefore, extraction is done using
 * line-aware patterns and contextual fallbacks.
 */

// ---------------------------------------------------------
// BASIC HELPERS
// ---------------------------------------------------------

function cleanText(text = "") {
  return String(text)
    .replace(/\r/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function getLines(text = "") {
  return cleanText(text)
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}

function parseMoney(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = String(value)
    .replace(/[$£€]/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .replace(/[^\d.-]/g, "");

  if (!cleaned) {
    return null;
  }

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

/**
 * Find a money amount on the SAME line as one of the labels.
 *
 * This is much safer than allowing \\s to cross multiple
 * OCR lines.
 */
function extractMoneyFromSameLine(text, labels) {
  const lines = getLines(text);

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    for (const label of labels) {
      if (!lowerLine.includes(label.toLowerCase())) {
        continue;
      }

      // Find every money-like number on the line.
      const matches = line.match(
        /(?:\$|CAD\s*)?\(?-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\)?/gi
      );

      if (!matches) {
        continue;
      }

      // Use the LAST money value on the line.
      // Banking statements often have:
      // "Total balance ........ $2,032.49"
      const values = matches
        .map(parseMoney)
        .filter(value => value !== null);

      if (values.length > 0) {
        return values[values.length - 1];
      }
    }
  }

  return null;
}

/**
 * Search a small context window around a label.
 *
 * Useful when OCR splits:
 *
 * Total balance
 * $2,032.49
 */
function extractMoneyFromContext(text, labels, windowSize = 2) {
  const lines = getLines(text);

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i].toLowerCase();

    const matched = labels.some(label =>
      current.includes(label.toLowerCase())
    );

    if (!matched) {
      continue;
    }

    const start = Math.max(0, i - 0);
    const end = Math.min(
      lines.length,
      i + windowSize + 1
    );

    const context = lines.slice(start, end).join(" ");

    const matches = context.match(
      /(?:\$|CAD\s*)?\(?-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\)?/gi
    );

    if (matches) {
      const values = matches
        .map(parseMoney)
        .filter(value => value !== null);

      if (values.length > 0) {
        return values[values.length - 1];
      }
    }
  }

  return null;
}

/**
 * Extract a date from the same line as a label.
 */
function extractDateFromSameLine(text, labels) {
  const lines = getLines(text);

  const datePatterns = [
    // Aug 19, 2026
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i,

    // August 19, 2026
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i,

    // 08/19/2026
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,

    // 2026-08-19
    /\b\d{4}-\d{1,2}-\d{1,2}\b/,
  ];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    const matched = labels.some(label =>
      lowerLine.includes(label.toLowerCase())
    );

    if (!matched) {
      continue;
    }

    for (const pattern of datePatterns) {
      const match = line.match(pattern);

      if (match) {
        return normalizeDate(match[0]);
      }
    }
  }

  return null;
}

/**
 * Extract a date from a small context window.
 */
function extractDateFromContext(text, labels, windowSize = 3) {
  const lines = getLines(text);

  const datePatterns = [
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i,

    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i,

    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,

    /\b\d{4}-\d{1,2}-\d{1,2}\b/,
  ];

  for (let i = 0; i < lines.length; i++) {
    const lowerLine = lines[i].toLowerCase();

    const matched = labels.some(label =>
      lowerLine.includes(label.toLowerCase())
    );

    if (!matched) {
      continue;
    }

    const context = lines
      .slice(
        i,
        Math.min(lines.length, i + windowSize + 1)
      )
      .join(" ");

    for (const pattern of datePatterns) {
      const match = context.match(pattern);

      if (match) {
        return normalizeDate(match[0]);
      }
    }
  }

  return null;
}

/**
 * Normalize common date formats.
 */
function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const cleaned = value
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

/**
 * Extract ordinary text from a line.
 */
function extractText(text, labels) {
  const lines = getLines(text);

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    for (const label of labels) {
      const index = lowerLine.indexOf(
        label.toLowerCase()
      );

      if (index === -1) {
        continue;
      }

      const result = line
        .substring(index + label.length)
        .replace(/^[:\-\s]+/, "")
        .trim();

      if (result) {
        return result;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------
// CREDIT CARD EXTRACTION
// ---------------------------------------------------------

function extractCreditCardFields(text) {

  /*
   * -------------------------------------------------------
   * BALANCE
   * -------------------------------------------------------
   *
   * CIBC statement example:
   *
   * Total balance       $2,032.49
   *
   * We intentionally prioritize "total balance".
   *
   * DO NOT use a generic "balance" search first because
   * OCR can encounter unrelated numbers such as:
   *
   * 21.99% interest
   * 32.49 over credit limit
   * etc.
   */

  let balance = extractMoneyFromSameLine(text, [
    "total balance",
    "new balance",
    "closing balance",
    "statement balance",
  ]);

  if (balance === null) {
    balance = extractMoneyFromContext(text, [
      "total balance",
      "new balance",
      "closing balance",
      "statement balance",
    ]);
  }

  /*
   * -------------------------------------------------------
   * CREDIT LIMIT
   * -------------------------------------------------------
   *
   * CIBC may display:
   *
   * Limit $2,000.00
   *
   * instead of:
   *
   * Credit limit $2,000.00
   */

  let creditLimit = extractMoneyFromSameLine(text, [
    "credit limit",
    "credit limit:",
    "limit",
  ]);

  if (creditLimit === null) {
    creditLimit = extractMoneyFromContext(text, [
      "credit limit",
      "limit",
    ]);
  }

  /*
   * -------------------------------------------------------
   * AVAILABLE CREDIT
   * -------------------------------------------------------
   *
   * CIBC commonly shows:
   *
   * Available $0.00
   *
   * Therefore we cannot only search for
   * "available credit".
   */

  let availableCredit = extractMoneyFromSameLine(text, [
    "available credit",
    "available",
  ]);

  if (availableCredit === null) {
    availableCredit = extractMoneyFromContext(text, [
      "available credit",
      "available",
    ]);
  }

  /*
   * -------------------------------------------------------
   * MINIMUM PAYMENT
   * -------------------------------------------------------
   *
   * VERY IMPORTANT:
   *
   * We prioritize "total minimum payment".
   *
   * We do NOT simply search for "minimum payment"
   * because the statement may contain:
   *
   * Amount over credit limit $32.49
   * Remaining minimum payment $70.63
   * Total minimum payment $103.12
   *
   * The correct value is $103.12.
   */

  let minimumPayment = extractMoneyFromSameLine(text, [
    "total minimum payment",
    "minimum payment due",
    "minimum payment",
  ]);

  if (minimumPayment === null) {
    minimumPayment = extractMoneyFromContext(text, [
      "total minimum payment",
      "minimum payment due",
      "minimum payment",
    ]);
  }

  /*
   * -------------------------------------------------------
   * DUE DATE
   * -------------------------------------------------------
   *
   * CIBC example:
   *
   * Total Minimum Payment due by Aug 19, 2026
   *
   * We search specifically around:
   *
   * "due by"
   *
   * "payment due"
   *
   * "minimum payment due"
   */

  let dueDate = extractDateFromSameLine(text, [
    "due by",
    "payment due",
    "minimum payment due",
    "due date",
  ]);

  if (dueDate === null) {
    dueDate = extractDateFromContext(text, [
      "due by",
      "payment due",
      "minimum payment due",
      "due date",
    ]);
  }

  /*
   * -------------------------------------------------------
   * FALLBACK DUE DATE
   * -------------------------------------------------------
   *
   * If OCR splits:
   *
   * Total Minimum Payment due by
   * Aug 19, 2026
   *
   * the context search above should catch it.
   *
   * This final fallback looks for any date close to the
   * words "due".
   */

  if (dueDate === null) {
    dueDate = extractDateFromContext(text, [
      "due",
    ], 4);
  }

  /*
   * -------------------------------------------------------
   * BANK
   * -------------------------------------------------------
   */

  let bank = null;

  const upperText = text.toUpperCase();

  if (upperText.includes("CIBC")) {
    bank = "CIBC";
  } else if (upperText.includes("RBC")) {
    bank = "RBC";
  } else if (upperText.includes("TD CANADA")) {
    bank = "TD";
  } else if (upperText.includes("SCOTIABANK")) {
    bank = "Scotiabank";
  } else if (upperText.includes("BMO")) {
    bank = "BMO";
  } else if (
    upperText.includes("CANADIAN TIRE")
  ) {
    bank = "Canadian Tire";
  }

  /*
   * -------------------------------------------------------
   * CARD NAME
   * -------------------------------------------------------
   */

  let cardName = null;

  if (
    upperText.includes("CIBC DIVIDEND")
  ) {
    cardName = "CIBC Dividend Visa";
  }

  if (!cardName) {
    cardName = extractText(text, [
      "card name",
      "card type",
    ]);
  }

  return {
    bank,

    cardName,

    balance,

    creditLimit,

    availableCredit,

    minimumPayment,

    dueDate,
  };
}

// ---------------------------------------------------------
// INCOME
// ---------------------------------------------------------

function extractIncomeFields(text) {

  const netPay = extractMoneyFromSameLine(text, [
    "net pay",
    "net earnings",
    "take home pay",
    "take-home pay",
    "net amount",
    "net income",
  ]);

  const grossPay = extractMoneyFromSameLine(text, [
    "gross pay",
    "gross earnings",
    "gross amount",
    "total earnings",
    "regular earnings",
  ]);

  const hourlyRate = extractMoneyFromSameLine(text, [
    "hourly rate",
    "pay rate",
    "rate",
  ]);

  const employer = extractText(text, [
    "employer",
    "company",
  ]);

  const employee = extractText(text, [
    "employee name",
    "employee",
    "name",
  ]);

  let payDate = extractDateFromSameLine(text, [
    "pay date",
    "payment date",
    "date paid",
  ]);

  if (!payDate) {
    payDate = extractDateFromContext(text, [
      "pay date",
      "payment date",
      "date paid",
    ]);
  }

  const payPeriod = extractText(text, [
    "pay period",
    "pay period ending",
    "period ending",
  ]);

  return {
    employer,
    employee,

    amount:
      netPay ??
      grossPay ??
      0,

    netPay,

    grossPay,

    hourlyRate,

    payDate,

    payPeriod,

    source: "Smart Scan",
  };
}

// ---------------------------------------------------------
// RECEIPT
// ---------------------------------------------------------

function extractReceiptFields(text) {

  const merchant = extractText(text, [
    "merchant",
    "store",
    "vendor",
  ]);

  const subtotal = extractMoneyFromSameLine(text, [
    "subtotal",
  ]);

  const tax = extractMoneyFromSameLine(text, [
    "tax",
    "hst",
    "gst",
    "pst",
  ]);

  const total = extractMoneyFromSameLine(text, [
    "grand total",
    "total",
    "amount paid",
  ]);

  let date = extractDateFromSameLine(text, [
    "date",
    "transaction date",
  ]);

  if (!date) {
    date = extractDateFromContext(text, [
      "date",
      "transaction date",
    ]);
  }

  return {
    merchant,

    subtotal,

    tax,

    total,

    date,
  };
}

// ---------------------------------------------------------
// STATEMENT
// ---------------------------------------------------------

function extractStatementFields(text) {

  const openingBalance = extractMoneyFromSameLine(text, [
    "opening balance",
    "beginning balance",
  ]);

  const closingBalance = extractMoneyFromSameLine(text, [
    "closing balance",
    "ending balance",
  ]);

  return {
    openingBalance,

    closingBalance,

    transactions: [],
  };
}

// ---------------------------------------------------------
// BANK ACCOUNT
// ---------------------------------------------------------

function extractBankAccountFields(text) {

  let balance = extractMoneyFromSameLine(text, [
    "available balance",
    "account balance",
    "current balance",
  ]);

  if (balance === null) {
    balance = extractMoneyFromSameLine(text, [
      "balance",
    ]);
  }

  const deposit = extractMoneyFromSameLine(text, [
    "deposit",
    "deposits",
  ]);

  const withdrawal = extractMoneyFromSameLine(text, [
    "withdrawal",
    "withdrawals",
  ]);

  return {
    account: null,

    balance,

    deposit,

    withdrawal,
  };
}

// ---------------------------------------------------------
// MAIN EXPORT
// ---------------------------------------------------------

export function extractFields(
  documentType,
  text = ""
) {

  switch (documentType) {

    case "credit-card":
      return extractCreditCardFields(text);

    case "receipt":
      return extractReceiptFields(text);

    case "income":
      return extractIncomeFields(text);

    case "statement":
      return extractStatementFields(text);

    case "bank-account":
      return extractBankAccountFields(text);

    default:
      return {};
  }
}
