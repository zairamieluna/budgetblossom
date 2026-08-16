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
 */

function cleanMoney(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/\$/g, "")
    .trim();

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

function extractMoney(text, label) {
  const regex = new RegExp(
    `${label}[\\s:$]*([0-9,]+\\.?[0-9]*)`,
    "i"
  );

  const match = text.match(regex);

  if (!match) return null;

  return cleanMoney(match[1]);
}

function extractDate(text, label) {
  const regex = new RegExp(
    `${label}[\\s:]*([A-Za-z]+\\s+\\d{1,2},?\\s+\\d{4}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})`,
    "i"
  );

  const match = text.match(regex);

  return match ? match[1].trim() : null;
}

function extractText(text, labels) {
  for (const label of labels) {
    const regex = new RegExp(
      `${label}[\\s:]+([^\\n\\r]+)`,
      "i"
    );

    const match = text.match(regex);

    if (match) {
      return match[1].trim();
    }
  }

  return null;
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


/* =========================================================
   CREDIT CARD EXTRACTION
   ========================================================= */

function extractCreditCardFields(text) {

  /*
   * CIBC statements can contain:
   *
   * Total balance                 $2,032.49
   * Limit                          $2,000.00
   * Available                      $0.00
   * Amount over your credit limit $32.49
   * Total Minimum Payment due by Aug 19, 2026
   *                                $103.12
   *
   * We MUST NOT interpret $32.49 as the credit limit.
   */

  const normalized = text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, "\n");


  /* ---------------------------------------------------------
     BALANCE
     --------------------------------------------------------- */

  let balance = null;

  const balancePatterns = [
    /total\s+balance\s*[:$]?\s*\$?\s*([0-9,]+\.\d{2})/i,

    /total\s+charges\s*[:$]?\s*\$?\s*([0-9,]+\.\d{2})/i,

    /statement\s+balance\s*[:$]?\s*\$?\s*([0-9,]+\.\d{2})/i,
  ];

  for (const pattern of balancePatterns) {
    const match = normalized.match(pattern);

    if (match) {
      balance = cleanMoney(match[1]);
      break;
    }
  }


  /* ---------------------------------------------------------
     CREDIT LIMIT
     --------------------------------------------------------- */

  let creditLimit = null;

  /*
   * Prefer "Limit" from the Summary section.
   *
   * IMPORTANT:
   * Do not search simply for "credit limit" because
   * "over your credit limit $32.49" would be matched.
   */

  const limitPatterns = [
    /\bLimit\s*\$?\s*([0-9,]+\.\d{2})/i,

    /\bCredit\s+Limit\s*[:$]?\s*\$?\s*([0-9,]+\.\d{2})/i,
  ];

  for (const pattern of limitPatterns) {
    const match = normalized.match(pattern);

    if (match) {
      creditLimit = cleanMoney(match[1]);
      break;
    }
  }


  /* ---------------------------------------------------------
     AVAILABLE CREDIT
     --------------------------------------------------------- */

  let availableCredit = null;

  const availablePatterns = [
    /\bAvailable\s*\$?\s*([0-9,]+\.\d{2})/i,

    /\bAvailable\s+Credit\s*[:$]?\s*\$?\s*([0-9,]+\.\d{2})/i,
  ];

  for (const pattern of availablePatterns) {
    const match = normalized.match(pattern);

    if (match) {
      availableCredit = cleanMoney(match[1]);
      break;
    }
  }


  /* ---------------------------------------------------------
     MINIMUM PAYMENT
     --------------------------------------------------------- */

  let minimumPayment = null;

  /*
   * CIBC example:
   *
   * Total Minimum Payment due by Aug 19, 2026
   * $103.12
   *
   * The number is NOT immediately after the label,
   * so the old extractMoney() function could not reliably
   * handle this.
   */

  const minimumPaymentPatterns = [

    /Total\s+Minimum\s+Payment\s+due\s+by[\s\S]{0,100}?\$?\s*([0-9,]+\.\d{2})/i,

    /Minimum\s+Payment\s+due\s+by[\s\S]{0,100}?\$?\s*([0-9,]+\.\d{2})/i,

    /Minimum\s+Payment[\s\S]{0,80}?\$?\s*([0-9,]+\.\d{2})/i,
  ];

  for (const pattern of minimumPaymentPatterns) {
    const match = normalized.match(pattern);

    if (match) {
      minimumPayment = cleanMoney(match[1]);
      break;
    }
  }


  /* ---------------------------------------------------------
     DUE DATE
     --------------------------------------------------------- */

  let dueDate = null;

  const dueDatePatterns = [

    /Total\s+Minimum\s+Payment\s+due\s+by\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,

    /Minimum\s+Payment\s+due\s+by\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,

    /Payment\s+due\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,

    /Payment\s+Due\s+Date\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
  ];

  for (const pattern of dueDatePatterns) {
    const match = normalized.match(pattern);

    if (match) {
      dueDate = match[1].trim();
      break;
    }
  }


  /* ---------------------------------------------------------
     CARD NAME
     --------------------------------------------------------- */

  let cardName = null;

  const cardNamePatterns = [
    /(CIBC\s+Dividend\s+Visa(?:\s+Card)?)/i,

    /(CIBC\s+[A-Za-z]+\s+Visa(?:\s+Card)?)/i,

    /(CIBC\s+[A-Za-z]+\s+Mastercard(?:\s+Card)?)/i,
  ];

  for (const pattern of cardNamePatterns) {
    const match = normalized.match(pattern);

    if (match) {
      cardName = match[1].trim();
      break;
    }
  }


  return {
    bank: "CIBC",

    cardName,

    balance,

    creditLimit,

    availableCredit,

    minimumPayment,

    dueDate,
  };
}


/* =========================================================
   INCOME
   ========================================================= */

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

  const payDate =
    extractDate(text, "pay date") ||
    extractDate(text, "payment date") ||
    extractDate(text, "date paid");

  const payPeriod =
    extractText(text, [
      "pay period",
      "pay period ending",
      "period ending",
    ]);

  return {
    employer,
    employee,

    amount: netPay ?? grossPay ?? 0,

    netPay,
    grossPay,
    hourlyRate,

    payDate,
    payPeriod,

    source: "Smart Scan",
  };
}


/* =========================================================
   MAIN EXTRACTION
   ========================================================= */

export function extractFields(
  documentType,
  text = ""
) {

  switch (documentType) {

    case "credit-card":
      return extractCreditCardFields(text);


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


    case "income":
      return extractIncomeFields(text);


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


    case "bank-account":
      return {
        account: null,

        balance:
          extractMoney(text, "balance") ??
          extractMoney(text, "available balance"),

        deposit: extractMoney(
          text,
          "deposit"
        ),

        withdrawal: extractMoney(
          text,
          "withdrawal"
        ),
      };


    default:
      return {};
  }
}
