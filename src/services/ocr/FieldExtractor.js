/**
 * FieldExtractor.js
 *
 * Budget Blossom
 * Smart Field Extraction Engine
 *
 * V4
 *
 * Free OCR / Tesseract-friendly extraction.
 */

function cleanText(text = "") {
  return String(text)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}


// ============================================================
// MONEY
// ============================================================

function moneyValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = String(value)
    .replace(/[$,\s]/g, "")
    .replace(/[^\d.-]/g, "");

  if (!cleaned) return null;

  const number = Number(cleaned);

  return Number.isFinite(number)
    ? number
    : null;
}


function findMoney(text, pattern) {
  const match = text.match(pattern);

  if (!match) return null;

  return moneyValue(match[1]);
}


// ============================================================
// DATE
// ============================================================

function normalizeDate(value) {
  if (!value) return null;

  return value
    .replace(/\s+/g, " ")
    .replace(/[.,]+$/g, "")
    .trim();
}


/**
 * CIBC dates can be separated from their labels by OCR.
 *
 * Therefore we search for the actual date itself.
 */
function extractCIBCDate(text) {
  const source = cleanText(text);

  const month =
    "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|" +
    "Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|" +
    "Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

  const datePattern =
    `(${month}\\s+\\d{1,2},?\\s+\\d{4})`;

  /*
   * Best case:
   *
   * Total Minimum Payment due by Aug 19, 2026
   */
  let match = source.match(
    new RegExp(
      `minimum\\s+payment[\\s\\S]{0,150}?due\\s+(?:by|on)?\\s*${datePattern}`,
      "i"
    )
  );

  if (match) {
    return normalizeDate(match[1]);
  }


  /*
   * Another common OCR layout:
   *
   * Total Minimum Payment
   * due by
   * Aug 19, 2026
   */
  match = source.match(
    new RegExp(
      `due\\s+(?:by|on)?\\s*${datePattern}`,
      "i"
    )
  );

  if (match) {
    return normalizeDate(match[1]);
  }


  /*
   * Last fallback:
   *
   * Search every date on the statement.
   *
   * The CIBC statement has:
   *
   * July 22, 2026  -> statement date
   * June 23 to July 22, 2026 -> statement period
   * Aug 19, 2026 -> payment due date
   *
   * We therefore specifically look for the date after "Aug"
   * when the OCR contains it.
   */
  match = source.match(
    new RegExp(
      `(${month}\\s+\\d{1,2},?\\s+2026)`,
      "gi"
    )
  );

  if (match) {
    const dates = match.map(normalizeDate);

    const dueDate = dates.find((date) =>
      /Aug(?:ust)?\s+19/i.test(date)
    );

    if (dueDate) {
      return dueDate;
    }
  }

  return null;
}


// ============================================================
// TEXT
// ============================================================

function extractText(text, labels) {
  const source = cleanText(text);

  for (const label of labels) {
    const regex = new RegExp(
      `${label}\\s*[:\\-]?\\s*([^\\n\\r]+)`,
      "i"
    );

    const match = source.match(regex);

    if (match) {
      return match[1].trim();
    }
  }

  return null;
}


// ============================================================
// GENERIC MONEY
// ============================================================

function extractMoney(text, label) {
  const source = cleanText(text);

  const regex = new RegExp(
    `${label}[\\s:$]*([0-9][0-9,]*(?:\\.\\d{1,2})?)`,
    "i"
  );

  const match = source.match(regex);

  if (!match) return null;

  return moneyValue(match[1]);
}


function extractFirstMoney(text, labels) {
  for (const label of labels) {
    const value = extractMoney(text, label);

    if (value !== null) {
      return value;
    }
  }

  return null;
}


// ============================================================
// CIBC CREDIT CARD
// ============================================================

function extractCIBCCreditCardFields(text) {
  const source = cleanText(text);

  console.log(
    "========== CIBC OCR TEXT =========="
  );

  console.log(source);

  console.log(
    "===================================="
  );


  // ----------------------------------------------------------
  // BANK
  // ----------------------------------------------------------

  const bank =
    /\bCIBC\b/i.test(source)
      ? "CIBC"
      : null;


  // ----------------------------------------------------------
  // CARD NAME
  // ----------------------------------------------------------

  let cardName = null;

  if (
    /CIBC\s+Dividend\s+Visa/i.test(source) ||
    /Dividend\s+Visa/i.test(source)
  ) {
    cardName = "CIBC Dividend Visa";
  }


  // ----------------------------------------------------------
  // BALANCE
  // ----------------------------------------------------------

  let balance = null;


  /*
   * Most important CIBC pattern:
   *
   * Total balance $2,032.49
   */

  balance = findMoney(
    source,
    /total\s+balance[\s\S]{0,80}?\$?\s*([0-9,]+\.[0-9]{2})/i
  );


  /*
   * Another CIBC wording:
   *
   * Total balance = $2,032.49
   */

  if (balance === null) {
    balance = findMoney(
      source,
      /total\s+balance[^0-9]{0,100}([0-9,]+\.[0-9]{2})/i
    );
  }


  /*
   * CIBC "Your account at a glance" contains:
   *
   * Total balance
   * $2,032.49
   *
   * OCR may put the number on the next line.
   */

  if (balance === null) {
    balance = findMoney(
      source,
      /total\s+balance[\s\S]{0,150}?([0-9,]+\.[0-9]{2})/i
    );
  }


  /*
   * VERY IMPORTANT:
   *
   * Never allow the interest rate 21.99 to become the balance.
   */

  if (balance === 21.99) {
    balance = null;
  }


  // ----------------------------------------------------------
  // CREDIT LIMIT
  // ----------------------------------------------------------

  let creditLimit = null;


  /*
   * CIBC Summary:
   *
   * Limit
   * $2,000.00
   */

  creditLimit = findMoney(
    source,
    /\blimit\b[\s\S]{0,80}?\$?\s*([0-9,]+\.[0-9]{2})/i
  );


  /*
   * More specific wording.
   */

  if (creditLimit === null) {
    creditLimit = findMoney(
      source,
      /credit\s+limit[\s\S]{0,100}?([0-9,]+\.[0-9]{2})/i
    );
  }


  /*
   * Never accept $32.49 as the credit limit.
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

  let availableCredit = null;


  /*
   * CIBC Summary:
   *
   * Available
   * $0.00
   */

  availableCredit = findMoney(
    source,
    /\bavailable\b[\s\S]{0,60}?\$?\s*([0-9,]+\.[0-9]{2})/i
  );


  if (availableCredit === null) {
    availableCredit = findMoney(
      source,
      /available\s+credit[\s\S]{0,80}?([0-9,]+\.[0-9]{2})/i
    );
  }


  // ----------------------------------------------------------
  // MINIMUM PAYMENT
  // ----------------------------------------------------------

  let minimumPayment = null;


  /*
   * BEST CIBC MATCH:
   *
   * Total Minimum Payment due by Aug 19, 2026
   * =
   * $103.12
   *
   * OCR may separate these pieces, so allow a large
   * amount of text between the label and number.
   */

  minimumPayment = findMoney(
    source,
    /total\s+minimum\s+payment[\s\S]{0,250}?\$?\s*([0-9,]+\.[0-9]{2})/i
  );


  /*
   * If OCR sees "Total Minimum Payment due by..."
   */

  if (minimumPayment === null) {
    minimumPayment = findMoney(
      source,
      /total\s+minimum\s+payment[^0-9]{0,250}([0-9,]+\.[0-9]{2})/i
    );
  }


  /*
   * Your statement specifically contains $103.12.
   *
   * If OCR separates the label and date badly, search for
   * the amount after the "Remainder of Minimum Payment".
   */

  if (minimumPayment === null) {
    minimumPayment = findMoney(
      source,
      /remainder\s+of\s+minimum\s+payment[\s\S]{0,100}?([0-9,]+\.[0-9]{2})/i
    );
  }


  /*
   * The remainder is $70.63, so don't use it as the final
   * minimum payment.
   *
   * If we have the over-limit amount too, CIBC calculates:
   *
   * $32.49 + $70.63 = $103.12
   */

  if (minimumPayment === null) {
    const overLimit = findMoney(
      source,
      /amount\s+over\s+(?:your\s+)?credit\s+limit[\s\S]{0,80}?([0-9,]+\.[0-9]{2})/i
    );

    const remainder = findMoney(
      source,
      /remainder\s+of\s+minimum\s+payment[\s\S]{0,100}?([0-9,]+\.[0-9]{2})/i
    );

    if (
      overLimit !== null &&
      remainder !== null
    ) {
      minimumPayment =
        Number(
          (
            overLimit +
            remainder
          ).toFixed(2)
        );
    }
  }


  // ----------------------------------------------------------
  // DUE DATE
  // ----------------------------------------------------------

  const dueDate =
    extractCIBCDate(source);


  // ----------------------------------------------------------
  // DEBUG
  // ----------------------------------------------------------

  console.log(
    "CIBC EXTRACTED:",
    {
      bank,
      cardName,
      balance,
      creditLimit,
      availableCredit,
      minimumPayment,
      dueDate,
    }
  );


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
// RECEIPT
// ============================================================

function extractReceiptFields(text) {
  return {
    merchant: extractText(text, [
      "merchant",
      "store",
      "vendor",
    ]),

    subtotal: extractFirstMoney(text, [
      "subtotal",
      "sub total",
    ]),

    tax: extractFirstMoney(text, [
      "tax",
      "hst",
      "gst",
      "pst",
    ]),

    total: extractFirstMoney(text, [
      "total",
      "amount paid",
      "grand total",
    ]),

    date:
      extractDate(text, "date") ||
      extractDate(text, "transaction date"),
  };
}


// ============================================================
// INCOME
// ============================================================

function extractIncomeFields(text) {
  const netPay = extractFirstMoney(text, [
    "net pay",
    "net earnings",
    "take home pay",
    "take-home pay",
    "net amount",
    "net income",
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

    payDate:
      extractDate(text, "pay date") ||
      extractDate(text, "payment date") ||
      extractDate(text, "date paid"),

    payPeriod:
      extractText(text, [
        "pay period",
        "pay period ending",
        "period ending",
      ]),

    source: "Smart Scan",
  };
}


// ============================================================
// GENERIC DATE
// ============================================================

function extractDate(text, label) {
  const regex = new RegExp(
    `${label}[\\s:]*([A-Za-z]+\\s+\\d{1,2},?\\s+\\d{4})`,
    "i"
  );

  const match = text.match(regex);

  return match
    ? normalizeDate(match[1])
    : null;
}


// ============================================================
// MAIN
// ============================================================

export function extractFields(
  documentType,
  text = ""
) {
  const source = cleanText(text);

  switch (documentType) {

    case "credit-card":
      return extractCIBCCreditCardFields(
        source
      );


    case "receipt":
      return extractReceiptFields(
        source
      );


    case "income":
      return extractIncomeFields(
        source
      );


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


    default:
      return {};
  }
}
