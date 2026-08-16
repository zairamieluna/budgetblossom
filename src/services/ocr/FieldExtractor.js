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
 * Designed to handle OCR text where:
 *   • dollar signs may be missing
 *   • commas may be missing
 *   • OCR may join numbers together
 *   • labels may appear on separate lines
 *   • multiple similar amounts appear on the same document
 */

// ============================================================
// BASIC HELPERS
// ============================================================

function cleanText(text = "") {
  return String(text)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


/**
 * Convert OCR money strings into numbers.
 *
 * Examples:
 * "$2,032.49" -> 2032.49
 * "2,032.49"  -> 2032.49
 * "2032.49"   -> 2032.49
 * "$0.00"     -> 0
 */
function moneyValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = String(value)
    .replace(/[$,\s]/g, "")
    .replace(/[^\d.-]/g, "");

  if (!cleaned) {
    return null;
  }

  const number = Number(cleaned);

  return Number.isFinite(number)
    ? number
    : null;
}


/**
 * Extract a money value after a label.
 *
 * This is useful for simple documents.
 */
function extractMoney(text, label) {
  if (!text || !label) return null;

  const regex = new RegExp(
    `${label}\\s*[:$]?\\s*\\$?\\s*([0-9][0-9,]*(?:\\.\\d{1,2})?)`,
    "i"
  );

  const match = text.match(regex);

  if (!match) return null;

  return moneyValue(match[1]);
}


/**
 * Try several labels until one produces a value.
 */
function extractFirstMoney(text, labels) {
  for (const label of labels) {
    const value = extractMoney(text, label);

    if (value !== null) {
      return value;
    }
  }

  return null;
}


/**
 * Extract text following a label until the end of the line.
 */
function extractText(text, labels) {
  if (!text || !Array.isArray(labels)) {
    return null;
  }

  const lines = cleanText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const label of labels) {
    const regex = new RegExp(
      `^${label}\\s*[:\\-]?\\s*(.+)$`,
      "i"
    );

    for (const line of lines) {
      const match = line.match(regex);

      if (match) {
        return match[1].trim();
      }
    }
  }

  return null;
}


// ============================================================
// DATE HELPERS
// ============================================================

const MONTH_PATTERN =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|" +
  "Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|" +
  "Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";


/**
 * Convert a date into a clean readable format.
 *
 * We intentionally keep this as text because Budget Blossom
 * can decide later how the date should be stored.
 */
function normalizeDate(dateText) {
  if (!dateText) return null;

  return dateText
    .replace(/\s+/g, " ")
    .replace(/[.,]+$/g, "")
    .trim();
}


/**
 * Extract a date after a label.
 */
function extractDate(text, label) {
  if (!text || !label) return null;

  const regex = new RegExp(
    `${label}\\s*(?:is\\s*)?[:\\-]?\\s*` +
      `(${MONTH_PATTERN}\\s+\\d{1,2}(?:,)?\\s+\\d{4})`,
    "i"
  );

  const match = text.match(regex);

  if (match) {
    return normalizeDate(match[1]);
  }

  return null;
}


/**
 * Specifically find dates like:
 *
 * Total Minimum Payment due by Aug 19, 2026
 *
 * This handles the CIBC statement shown in the screenshot.
 */
function extractDueDate(text) {
  if (!text) return null;

  const patterns = [

    // Total Minimum Payment due by Aug 19, 2026
    /(?:total\s+minimum\s+payment|minimum\s+payment)\s+due\s+(?:by|on)\s+(\w+\s+\d{1,2},?\s+\d{4})/i,

    // Payment due by Aug 19, 2026
    /payment\s+due\s+(?:by|on)\s+(\w+\s+\d{1,2},?\s+\d{4})/i,

    // Due by Aug 19, 2026
    /\bdue\s+(?:by|on)\s+(\w+\s+\d{1,2},?\s+\d{4})/i,

    // Aug 19, 2026 after "due"
    /\bdue\b[^\n]{0,80}?(\w+\s+\d{1,2},?\s+\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      return normalizeDate(match[1]);
    }
  }

  return null;
}


// ============================================================
// CREDIT CARD EXTRACTION
// ============================================================

/**
 * Extract a money amount from a line.
 *
 * Example:
 *
 * Limit                         $2,000.00
 *
 * -> 2000
 */
function extractMoneyFromLine(line) {
  if (!line) return null;

  /*
   * Prefer amounts containing a decimal.
   *
   * This is important because OCR can otherwise interpret
   * nearby numbers such as 32.49 incorrectly.
   */
  const decimalMatches = line.match(
    /\$?\s*[0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}/g
  );

  if (decimalMatches && decimalMatches.length) {
    return moneyValue(decimalMatches[decimalMatches.length - 1]);
  }

  /*
   * Fallback for numbers without commas.
   */
  const plainMatches = line.match(
    /\$?\s*[0-9]+(?:\.[0-9]{1,2})?/g
  );

  if (plainMatches && plainMatches.length) {
    return moneyValue(plainMatches[plainMatches.length - 1]);
  }

  return null;
}


/**
 * Find the first line containing one of the supplied labels.
 */
function findLine(text, labels) {
  const lines = cleanText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const label of labels) {
    const regex = new RegExp(label, "i");

    const line = lines.find((item) =>
      regex.test(item)
    );

    if (line) {
      return line;
    }
  }

  return null;
}


/**
 * Find a monetary value associated with a label.
 *
 * We only inspect the SAME line first.
 *
 * This prevents:
 *
 * "Amount over your credit limit $32.49"
 *
 * from being mistaken for:
 *
 * "Credit Limit $2,000.00"
 */
function extractLabeledLineMoney(text, labels) {
  const lines = cleanText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const label of labels) {
    const labelRegex = new RegExp(label, "i");

    for (const line of lines) {
      if (!labelRegex.test(line)) continue;

      const value = extractMoneyFromLine(line);

      if (value !== null) {
        return value;
      }
    }
  }

  return null;
}


/**
 * Extract CIBC-style credit card information.
 *
 * This is deliberately separate from the generic extractor
 * because credit card statements contain many amounts:
 *
 * Previous balance
 * Payments
 * Purchases
 * Interest
 * Fees
 * Total charges
 * Total balance
 * Amount due
 * Amount over credit limit
 * Minimum payment
 * Credit limit
 * Available credit
 */
function extractCreditCardFields(text) {
  const source = cleanText(text);

  // ----------------------------------------------------------
  // BANK
  // ----------------------------------------------------------

  let bank = null;

  if (/\bCIBC\b/i.test(source)) {
    bank = "CIBC";
  }


  // ----------------------------------------------------------
  // CARD NAME
  // ----------------------------------------------------------

  let cardName = null;

  const cardNameMatch = source.match(
    /(?:CIBC\s+)?(Dividend\s+(?:Visa|Mastercard|World\s+Elite))/i
  );

  if (cardNameMatch) {
    cardName = `CIBC ${cardNameMatch[1]}`
      .replace(/\s+/g, " ")
      .trim();
  } else if (/CIBC\s+Dividend\s+Visa/i.test(source)) {
    cardName = "CIBC Dividend Visa";
  }


  // ----------------------------------------------------------
  // BALANCE
  // ----------------------------------------------------------

  /*
   * IMPORTANT:
   *
   * We do NOT use "statement balance" first.
   *
   * The CIBC statement in the screenshot says:
   *
   * Total balance     $2,032.49
   *
   * That is the balance we want.
   */

  let balance =
    extractLabeledLineMoney(source, [
      "^total\\s+balance",
      "\\btotal\\s+balance\\b",
    ]);


  /*
   * Fallback:
   *
   * Some OCR versions may produce:
   *
   * Total balance $2,032.49
   *
   * or:
   *
   * Total balance 2032.49
   */
  if (balance === null) {
    balance = extractMoney(
      source,
      "total balance"
    );
  }


  /*
   * Second fallback to statement balance.
   */
  if (balance === null) {
    balance = extractLabeledLineMoney(source, [
      "statement balance",
    ]);
  }


  // ----------------------------------------------------------
  // CREDIT LIMIT
  // ----------------------------------------------------------

  /*
   * IMPORTANT:
   *
   * We specifically prefer the SUMMARY section's
   * "Limit $2,000.00".
   *
   * We must NOT accidentally capture:
   *
   * "Amount over your credit limit $32.49"
   */
  let creditLimit = null;

  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);


  /*
   * First try a line beginning with "Limit".
   */
  for (const line of lines) {
    if (/^limit\b/i.test(line)) {
      const value = extractMoneyFromLine(line);

      if (value !== null) {
        creditLimit = value;
        break;
      }
    }
  }


  /*
   * Then try "Credit Limit".
   */
  if (creditLimit === null) {
    creditLimit = extractLabeledLineMoney(
      source,
      [
        "^credit\\s+limit",
        "\\bcredit\\s+limit\\b",
      ]
    );
  }


  /*
   * IMPORTANT SAFETY CHECK:
   *
   * If OCR accidentally captures the "amount over limit"
   * ($32.49), don't use it as the credit limit.
   */
  if (
    creditLimit !== null &&
    creditLimit < 100
  ) {
    creditLimit = null;
  }


  // ----------------------------------------------------------
  // AVAILABLE CREDIT
  // ----------------------------------------------------------

  let availableCredit =
    extractLabeledLineMoney(
      source,
      [
        "^available\\b",
        "^available\\s+credit",
        "\\bavailable\\s+credit\\b",
      ]
    );


  /*
   * CIBC often has:
   *
   * Available        $0.00
   *
   * Therefore "Available" by itself is valid.
   */
  if (availableCredit === null) {
    for (const line of lines) {
      if (/^available\b/i.test(line)) {
        const value =
          extractMoneyFromLine(line);

        if (value !== null) {
          availableCredit = value;
          break;
        }
      }
    }
  }


  // ----------------------------------------------------------
  // MINIMUM PAYMENT
  // ----------------------------------------------------------

  /*
   * The screenshot contains:
   *
   * Amount Due              $2,032.49
   *
   * Amount over credit limit  $32.49
   *
   * Remainder of Minimum Payment $70.63
   *
   * Total Minimum Payment due by Aug 19, 2026 $103.12
   *
   * We want $103.12.
   */

  let minimumPayment = null;


  /*
   * BEST MATCH:
   *
   * Total Minimum Payment
   */
  minimumPayment =
    extractLabeledLineMoney(
      source,
      [
        "^total\\s+minimum\\s+payment",
        "\\btotal\\s+minimum\\s+payment\\b",
      ]
    );


  /*
   * Sometimes OCR puts "due" between the label
   * and the amount.
   */
  if (minimumPayment === null) {
    const match = source.match(
      /total\s+minimum\s+payment[^\n]{0,100}?\$?\s*([0-9,]+\.[0-9]{2})/i
    );

    if (match) {
      minimumPayment =
        moneyValue(match[1]);
    }
  }


  /*
   * Fallback:
   *
   * "Minimum Payment $103.12"
   */
  if (minimumPayment === null) {
    minimumPayment =
      extractLabeledLineMoney(
        source,
        [
          "^minimum\\s+payment",
          "\\bminimum\\s+payment\\b",
        ]
      );
  }


  // ----------------------------------------------------------
  // DUE DATE
  // ----------------------------------------------------------

  const dueDate = extractDueDate(source);


  // ----------------------------------------------------------
  // RETURN
  // ----------------------------------------------------------

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


// ============================================================
// RECEIPTS
// ============================================================

function extractReceiptFields(text) {
  const source = cleanText(text);

  return {
    merchant: extractText(source, [
      "merchant",
      "store",
      "vendor",
    ]),

    subtotal: extractFirstMoney(source, [
      "subtotal",
      "sub total",
    ]),

    tax: extractFirstMoney(source, [
      "tax",
      "hst",
      "gst",
      "pst",
    ]),

    total: extractFirstMoney(source, [
      "total",
      "amount paid",
      "grand total",
    ]),

    date:
      extractDate(source, "date") ||
      extractDate(source, "transaction date"),
  };
}


// ============================================================
// INCOME / PAY STUB
// ============================================================

function extractIncomeFields(text) {
  const source = cleanText(text);

  /*
   * Net income is the most useful number for Budget Blossom
   * because this is the amount that actually enters the
   * Budget Pool.
   */

  const netPay = extractFirstMoney(source, [
    "net pay",
    "net earnings",
    "take home pay",
    "take-home pay",
    "net amount",
    "net income",
  ]);

  const grossPay = extractFirstMoney(source, [
    "gross pay",
    "gross earnings",
    "gross amount",
    "total earnings",
    "regular earnings",
  ]);

  const hourlyRate = extractFirstMoney(source, [
    "hourly rate",
    "pay rate",
    "rate",
  ]);

  const employer = extractText(source, [
    "employer",
    "company",
  ]);

  const employee = extractText(source, [
    "employee name",
    "employee",
    "name",
  ]);

  const payDate =
    extractDate(source, "pay date") ||
    extractDate(source, "payment date") ||
    extractDate(source, "date paid");

  const payPeriod =
    extractText(source, [
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


// ============================================================
// MAIN FIELD EXTRACTOR
// ============================================================

export function extractFields(
  documentType,
  text = ""
) {
  const source = cleanText(text);

  switch (documentType) {

    // ========================================================
    // CREDIT CARD
    // ========================================================

    case "credit-card":
      return extractCreditCardFields(source);


    // ========================================================
    // RECEIPT
    // ========================================================

    case "receipt":
      return extractReceiptFields(source);


    // ========================================================
    // INCOME
    // ========================================================

    case "income":
      return extractIncomeFields(source);


    // ========================================================
    // STATEMENT
    // ========================================================

    case "statement":
      return {
        openingBalance:
          extractFirstMoney(source, [
            "opening balance",
            "previous balance",
          ]),

        closingBalance:
          extractFirstMoney(source, [
            "closing balance",
            "ending balance",
          ]),

        transactions: [],
      };


    // ========================================================
    // BANK ACCOUNT
    // ========================================================

    case "bank-account":
      return {
        account: extractText(source, [
          "account",
          "account name",
        ]),

        balance:
          extractFirstMoney(source, [
            "balance",
            "available balance",
          ]),

        deposit:
          extractFirstMoney(source, [
            "deposit",
            "deposits",
          ]),

        withdrawal:
          extractFirstMoney(source, [
            "withdrawal",
            "withdrawals",
          ]),
      };


    // ========================================================
    // UNKNOWN
    // ========================================================

    default:
      return {};
  }
}
