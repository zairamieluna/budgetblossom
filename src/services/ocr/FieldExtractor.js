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
 * Designed for OCR/PDF text where:
 *   - labels and values may be on the same line
 *   - labels and values may be on different lines
 *   - banks use different terminology
 *   - dates may use different formats
 */


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function normalizeText(text = "") {
  return String(text)
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}


/**
 * Convert:
 *   "$1,441.49" -> 1441.49
 *   "1,441.49"  -> 1441.49
 *   "$0"        -> 0
 */
function moneyToNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = String(value)
    .replace(/[$€£¥,\s]/g, "")
    .replace(/[^\d.-]/g, "");

  if (!cleaned) {
    return null;
  }

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}


/**
 * Extract the first monetary amount from a string.
 *
 * Handles:
 *   $1,441.49
 *   1,441.49
 *   $0
 *   31.71
 */
function extractMoneyFromString(value) {
  if (!value) {
    return null;
  }

  const match = String(value).match(
    /(?:\$|CAD\s*)?-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|(?:\$|CAD\s*)?-?\d+(?:\.\d{2})?/i
  );

  if (!match) {
    return null;
  }

  return moneyToNumber(match[0]);
}


/* =========================================================
   MONEY EXTRACTION
   ========================================================= */

/**
 * Find a money value associated with a label.
 *
 * This works when:
 *
 * Statement balance $1,441.49
 *
 * OR:
 *
 * Statement balance
 * $1,441.49
 *
 * OR OCR produces:
 *
 * Statement balance       1,441.49
 */
function extractMoneyNearLabels(text, labels) {
  const normalized = normalizeText(text);

  for (const label of labels) {

    const escapedLabel = label.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    /*
     * Same line / nearby value.
     */
    const regex = new RegExp(
      `${escapedLabel}\\s*(?:[:\\-]|\\$|CAD\\s*)?\\s*(-?\\$?\\s*\\d[\\d,]*(?:\\.\\d{1,2})?)`,
      "i"
    );

    const match = normalized.match(regex);

    if (match) {
      const value = moneyToNumber(match[1]);

      if (value !== null) {
        return value;
      }
    }


    /*
     * Handle OCR/PDF where label and amount
     * are separated by a newline.
     */
    const lines = normalized.split("\n");

    for (let i = 0; i < lines.length; i++) {

      if (
        lines[i]
          .toLowerCase()
          .includes(label.toLowerCase())
      ) {

        /*
         * First check the same line.
         */
        const sameLine = extractMoneyFromString(
          lines[i].replace(
            new RegExp(escapedLabel, "i"),
            ""
          )
        );

        if (sameLine !== null) {
          return sameLine;
        }


        /*
         * Then check the next few lines.
         */
        for (
          let offset = 1;
          offset <= 3 && i + offset < lines.length;
          offset++
        ) {

          const nextValue = extractMoneyFromString(
            lines[i + offset]
          );

          if (nextValue !== null) {
            return nextValue;
          }
        }
      }
    }
  }

  return null;
}


/* =========================================================
   DATE EXTRACTION
   ========================================================= */

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  const cleaned = value
    .replace(/\s+/g, " ")
    .trim();

  /*
   * Month name formats:
   *
   * Aug 14, 2026
   * August 14, 2026
   * Aug 14 2026
   */
  const monthDate = cleaned.match(
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,)?\s+\d{4}\b/i
  );

  if (monthDate) {
    return monthDate[0].replace(
      /(\d{1,2})(st|nd|rd|th)/i,
      "$1"
    );
  }


  /*
   * Numeric formats:
   *
   * 08/14/2026
   * 08-14-2026
   * 2026-08-14
   */
  const numericDate = cleaned.match(
    /\b(?:\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4})\b/
  );

  if (numericDate) {
    return numericDate[0];
  }

  return null;
}


/**
 * Extract date near a label.
 *
 * Supports:
 *
 * Minimum payment due
 * Aug 14, 2026
 *
 * Payment due: Aug 19, 2026
 *
 * Due date
 * 08/19/2026
 */
function extractDateNearLabels(text, labels) {
  const normalized = normalizeText(text);
  const lines = normalized.split("\n");

  for (const label of labels) {

    const escapedLabel = label.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );


    /*
     * Same line.
     */
    const sameLineRegex = new RegExp(
      `${escapedLabel}\\s*(?:[:\\-])?\\s*(.{0,80})`,
      "i"
    );

    const sameLineMatch = normalized.match(
      sameLineRegex
    );

    if (sameLineMatch) {
      const date = parseDateValue(
        sameLineMatch[1]
      );

      if (date) {
        return date;
      }
    }


    /*
     * Label may be on one line and
     * date on the following line.
     */
    for (let i = 0; i < lines.length; i++) {

      if (
        lines[i]
          .toLowerCase()
          .includes(label.toLowerCase())
      ) {

        /*
         * Same line first.
         */
        const sameLineDate = parseDateValue(
          lines[i].replace(
            new RegExp(escapedLabel, "i"),
            ""
          )
        );

        if (sameLineDate) {
          return sameLineDate;
        }


        /*
         * Search next 3 lines.
         */
        for (
          let offset = 1;
          offset <= 3 && i + offset < lines.length;
          offset++
        ) {

          const nextDate = parseDateValue(
            lines[i + offset]
          );

          if (nextDate) {
            return nextDate;
          }
        }
      }
    }
  }

  return null;
}


/* =========================================================
   TEXT EXTRACTION
   ========================================================= */

function extractText(text, labels) {
  const normalized = normalizeText(text);
  const lines = normalized.split("\n");

  for (const label of labels) {

    const escapedLabel = label.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    for (let i = 0; i < lines.length; i++) {

      const regex = new RegExp(
        `^\\s*${escapedLabel}\\s*[:\\-]?\\s*(.*)$`,
        "i"
      );

      const match = lines[i].match(regex);

      if (match && match[1].trim()) {
        return match[1].trim();
      }

      /*
       * Handle:
       *
       * Employer
       * CIBC
       */
      if (
        lines[i]
          .toLowerCase()
          .includes(label.toLowerCase())
      ) {

        if (i + 1 < lines.length) {
          const next = lines[i + 1].trim();

          if (next) {
            return next;
          }
        }
      }
    }
  }

  return null;
}


/* =========================================================
   INCOME
   ========================================================= */

function extractFirstMoney(text, labels) {
  return extractMoneyNearLabels(
    text,
    labels
  );
}


function extractIncomeFields(text) {

  const netPay = extractFirstMoney(text, [
    "net pay",
    "net earnings",
    "take home pay",
    "take-home pay",
    "net amount",
    "net income",
    "net payment",
  ]);


  const grossPay = extractFirstMoney(text, [
    "gross pay",
    "gross earnings",
    "gross amount",
    "total earnings",
    "regular earnings",
  ]);


  const hourlyRate = extractFirstMoney(text, [
    "hourly rate",
    "pay rate",
    "hourly wage",
    "rate of pay",
  ]);


  const employer = extractText(text, [
    "employer",
    "company",
    "employer name",
  ]);


  const employee = extractText(text, [
    "employee name",
    "employee",
    "name",
  ]);


  const payDate =
    extractDateNearLabels(text, [
      "pay date",
      "payment date",
      "date paid",
      "paid date",
    ]);


  const payPeriod =
    extractText(text, [
      "pay period",
      "pay period ending",
      "period ending",
    ]);


  return {
    employer,
    employee,

    /*
     * Net pay is preferred because this is
     * the actual amount entering the budget.
     */
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


/* =========================================================
   CREDIT CARD EXTRACTION
   ========================================================= */

function extractCreditCardFields(text) {

  /*
   * IMPORTANT:
   *
   * Do NOT use simply:
   *
   * extractMoney(text, "balance")
   *
   * because OCR may encounter:
   *
   * Available balance
   * Current balance
   * Statement balance
   *
   * and return the wrong number.
   *
   * We therefore use very specific labels first.
   */


  /* -------------------------------------------------------
     BALANCE
     ------------------------------------------------------- */

  let balance = extractMoneyNearLabels(text, [

    /*
     * Most specific first.
     */
    "statement balance",

    "statement amount",

    "statement total",

    "closing balance",

    "current balance",

    "balance owing",

    "amount owing",

    "total balance",

    "balance due",

    "new balance",

  ]);


  /*
   * Some statements simply have a SUMMARY section
   * containing:
   *
   * Balance       $2,032.49
   *
   * This fallback is intentionally LAST.
   */
  if (balance === null) {
    balance = extractMoneyNearLabels(text, [
      "balance",
    ]);
  }


  /* -------------------------------------------------------
     CREDIT LIMIT
     ------------------------------------------------------- */

  const creditLimit =
    extractMoneyNearLabels(text, [

      "credit limit",

      "total credit limit",

      "authorized credit limit",

      "approved credit limit",

      "card limit",

      "limit",

    ]);


  /* -------------------------------------------------------
     AVAILABLE CREDIT
     ------------------------------------------------------- */

  const availableCredit =
    extractMoneyNearLabels(text, [

      "available credit",

      "available amount",

      "available balance",

      "credit available",

      "remaining credit",

      "remaining available credit",

    ]);


  /* -------------------------------------------------------
     MINIMUM PAYMENT
     ------------------------------------------------------- */

  const minimumPayment =
    extractMoneyNearLabels(text, [

      /*
       * Very specific labels first.
       */
      "minimum payment",

      "minimum payment amount",

      "minimum amount due",

      "minimum due",

      "payment due amount",

    ]);


  /* -------------------------------------------------------
     DUE DATE
     ------------------------------------------------------- */

  const dueDate =
    extractDateNearLabels(text, [

      /*
       * CIBC example:
       *
       * Minimum payment due
       * Aug 14, 2026
       */
      "minimum payment due",

      "payment due date",

      "payment due",

      "due date",

      "due on",

      "minimum amount due",

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


/* =========================================================
   RECEIPT
   ========================================================= */

function extractReceiptFields(text) {

  return {

    merchant: extractText(text, [
      "merchant",
      "store",
      "vendor",
      "seller",
    ]),

    subtotal: extractMoneyNearLabels(text, [
      "subtotal",
      "sub total",
    ]),

    tax: extractMoneyNearLabels(text, [
      "tax",
      "sales tax",
      "hst",
      "gst",
      "pst",
    ]),

    total: extractMoneyNearLabels(text, [
      "grand total",
      "total",
      "amount paid",
      "total amount",
    ]),

    date: extractDateNearLabels(text, [
      "transaction date",
      "purchase date",
      "date",
    ]),
  };
}


/* =========================================================
   BANK ACCOUNT
   ========================================================= */

function extractBankAccountFields(text) {

  return {

    account: extractText(text, [
      "account name",
      "account",
      "account type",
    ]),

    balance:
      extractMoneyNearLabels(text, [
        "current balance",
        "account balance",
        "available balance",
        "balance",
      ]),

    deposit:
      extractMoneyNearLabels(text, [
        "deposit",
        "total deposits",
        "deposit amount",
      ]),

    withdrawal:
      extractMoneyNearLabels(text, [
        "withdrawal",
        "total withdrawals",
        "withdrawal amount",
      ]),
  };
}


/* =========================================================
   STATEMENT
   ========================================================= */

function extractStatementFields(text) {

  return {

    openingBalance:
      extractMoneyNearLabels(text, [
        "opening balance",
        "beginning balance",
        "starting balance",
      ]),

    closingBalance:
      extractMoneyNearLabels(text, [
        "closing balance",
        "ending balance",
        "statement balance",
      ]),

    transactions: [],
  };
}


/* =========================================================
   MAIN EXPORT
   ========================================================= */

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
