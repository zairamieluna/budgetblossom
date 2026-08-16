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

/**
 * Extract money directly after a label.
 */
function extractMoney(text, label) {
  const regex = new RegExp(
    `${label}[\\s:$]*([0-9,]+(?:\\.\\d{1,2})?)`,
    "i"
  );

  const match = text.match(regex);

  if (!match) return null;

  return Number(
    match[1].replace(/,/g, "")
  );
}

/**
 * Extract money when other text may appear between
 * the label and the amount.
 *
 * Useful for statements such as:
 *
 * Total Minimum Payment due by Aug 19, 2026
 * $103.12
 */
function extractMoneyAfterLabel(text, label) {
  const regex = new RegExp(
    `${label}[\\s\\S]{0,150}?\\$?\\s*([0-9,]+(?:\\.\\d{1,2})?)`,
    "i"
  );

  const match = text.match(regex);

  if (!match) return null;

  return Number(
    match[1].replace(/,/g, "")
  );
}

/**
 * Extract a date after a label.
 *
 * This intentionally captures only a normal date instead
 * of consuming an entire OCR line.
 */
function extractDate(text, label) {
  const regex = new RegExp(
    `${label}[\\s:]*` +
      `(?:by|on)?[\\s:]*` +
      `(` +
        `(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|` +
        `Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|` +
        `Nov(?:ember)?|Dec(?:ember)?)` +
        `[\\s,\\-]+\\d{1,2}[\\s,\\-]+\\d{4}` +
      `)`,
    "i"
  );

  const match = text.match(regex);

  return match ? match[1].trim() : null;
}

/**
 * Extract text after a label.
 */
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

/**
 * Try multiple money labels.
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
 * Extract income fields.
 */
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

/**
 * Extract credit-card fields.
 *
 * Designed to handle statements such as:
 *
 * Total balance                 $2,032.49
 * Limit                         $2,000.00
 * Available                     $0.00
 *
 * Total Minimum Payment due by
 * Aug 19, 2026                  $103.12
 */
function extractCreditCardFields(text) {
  /*
   * Card name
   */
  const cardName =
    extractText(text, [
      "card name",
      "card type",
    ]) ||
    findCardName(text);

  /*
   * Bank / institution
   */
  const bank =
    findBankName(text);

  /*
   * Balance
   *
   * CIBC uses "Total balance".
   */
  const balance =
    extractFirstMoney(text, [
      "statement balance",
      "total balance",
      "account balance",
      "current balance",
    ]) ??
    extractMoneyAfterLabel(
      text,
      "total balance"
    );

  /*
   * Credit limit
   *
   * CIBC uses simply "Limit".
   */
  const creditLimit =
    extractFirstMoney(text, [
      "credit limit",
      "limit",
    ]);

  /*
   * Available credit
   *
   * CIBC uses simply "Available".
   */
  const availableCredit =
    extractFirstMoney(text, [
      "available credit",
      "available",
    ]);

  /*
   * Minimum payment
   *
   * CIBC may have:
   *
   * Total Minimum Payment due by Aug 19, 2026
   * $103.12
   */
  let minimumPayment =
    extractFirstMoney(text, [
      "minimum payment",
      "total minimum payment",
      "minimum amount due",
    ]);

  if (minimumPayment === null) {
    minimumPayment =
      extractMoneyAfterLabel(
        text,
        "total minimum payment"
      );
  }

  /*
   * Due date.
   *
   * IMPORTANT:
   * Look specifically for "due by" / "payment due"
   * instead of grabbing the first date in the document.
   */
  const dueDate =
    extractDate(
      text,
      "payment due"
    ) ||
    extractDate(
      text,
      "minimum payment due"
    ) ||
    extractDate(
      text,
      "total minimum payment due"
    ) ||
    extractDueDate(text);

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

/**
 * Find a due date using common statement wording.
 *
 * Examples:
 *   payment due by Aug 19, 2026
 *   minimum payment due by Aug 19, 2026
 *   due by Aug 19, 2026
 */
function extractDueDate(text) {
  const patterns = [
    /(?:payment|minimum payment|total minimum payment)?\s*due\s*(?:by|on)?\s*((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s,\-]+\d{1,2}[\s,\-]+\d{4})/i,

    /due\s+by\s+((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s,\-]+\d{1,2}[\s,\-]+\d{4})/i,

    /due\s+on\s+((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s,\-]+\d{1,2}[\s,\-]+\d{4})/i,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);

    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Try to identify the card name.
 */
function findCardName(text) {
  const knownCards = [
    /CIBC\s+Dividend\s+Visa/i,
    /CIBC\s+Dividend\s+Visa\s+Card/i,
    /CIBC\s+Visa/i,
    /CIBC\s+Mastercard/i,
    /CIBC\s+Mastercard/i,
  ];

  for (const regex of knownCards) {
    const match = text.match(regex);

    if (match) {
      return match[0].trim();
    }
  }

  return null;
}

/**
 * Try to identify the financial institution.
 */
function findBankName(text) {
  const banks = [
    "CIBC",
    "RBC",
    "TD",
    "BMO",
    "Scotiabank",
    "National Bank",
    "Tangerine",
    "Simplii",
    "Desjardins",
  ];

  for (const bank of banks) {
    const regex = new RegExp(
      `\\b${bank}\\b`,
      "i"
    );

    if (regex.test(text)) {
      return bank;
    }
  }

  return null;
}

/**
 * Main field extraction function.
 */
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

        date:
          extractDate(text, "date") ||
          extractDate(text, "purchase date"),
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
